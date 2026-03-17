import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderator_snapshot_list_by_moderator_with_filters(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuth);
  const moderatorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: moderatorAuth.code,
        },
      },
    );
  typia.assert(moderatorAssignment);
  const now: Date = new Date();
  const createdAtFrom: string = new Date(
    now.getTime() - 1000 * 60 * 60,
  ).toISOString();
  const createdAtTo: string = new Date(
    now.getTime() + 1000 * 60 * 60,
  ).toISOString();
  const page = 1;
  const limit = 10;
  const snapshots =
    await api.functional.communityPlatform.member.communities.moderators.snapshots.index(
      moderatorConnection,
      {
        communityId: community.id,
        moderatorId: moderatorAssignment.id,
        body: {
          page,
          limit,
          createdAtFrom,
          createdAtTo,
        } satisfies ICommunityPlatformCommunityModeratorSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "pagination current page matches request",
    snapshots.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    snapshots.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination record count covers returned rows",
    snapshots.pagination.records >= snapshots.data.length,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned rows do not exceed requested limit",
    snapshots.data.length <= limit,
  );
  for (const snapshot of snapshots.data) {
    TestValidator.equals(
      "snapshot belongs to requested moderator assignment",
      snapshot.communityModerator.id,
      moderatorAssignment.id,
    );
    TestValidator.equals(
      "snapshot belongs to requested community",
      snapshot.communityModerator.community.id,
      community.id,
    );
    TestValidator.predicate(
      "snapshot created_at is within inclusive lower bound",
      new Date(snapshot.created_at).getTime() >=
        new Date(createdAtFrom).getTime(),
    );
    TestValidator.predicate(
      "snapshot created_at is within inclusive upper bound",
      new Date(snapshot.created_at).getTime() <=
        new Date(createdAtTo).getTime(),
    );
  }
}
