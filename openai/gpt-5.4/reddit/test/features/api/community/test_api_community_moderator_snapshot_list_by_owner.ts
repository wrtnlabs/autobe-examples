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

export async function test_api_community_moderator_snapshot_list_by_owner(
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
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorMemberAuth = await authorize_member_join(
    moderatorMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(moderatorMemberAuth);
  const moderator =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: moderatorMemberAuth.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  const snapshots =
    await api.functional.communityPlatform.member.communities.moderators.snapshots.index(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunityModeratorSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "pagination current page is positive",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshots.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned data length does not exceed pagination limit",
    snapshots.data.length <= snapshots.pagination.limit,
  );
  TestValidator.predicate(
    "records cover current page data length",
    snapshots.pagination.records >= snapshots.data.length,
  );
  TestValidator.equals(
    "pagination pages matches documented calculation",
    snapshots.pagination.pages,
    Math.ceil(snapshots.pagination.records / snapshots.pagination.limit),
  );
  snapshots.data.forEach((row, index) => {
    TestValidator.equals(
      `snapshot ${index} belongs to requested moderator assignment`,
      row.communityModerator.id,
      moderator.id,
    );
    TestValidator.equals(
      `snapshot ${index} stays in requested community`,
      row.communityModerator.community.id,
      community.id,
    );
    TestValidator.equals(
      `snapshot ${index} is for the created moderator member`,
      row.communityModerator.member.id,
      moderatorMemberAuth.id,
    );
    TestValidator.equals(
      `snapshot ${index} was granted by the owner member`,
      row.communityModerator.grantedByMember.id,
      ownerAuth.id,
    );
  });
  if (snapshots.data.length > 1) {
    snapshots.data.slice(1).forEach((row, index) => {
      const previous = snapshots.data[index];
      TestValidator.predicate(
        `snapshot rows are ordered newest first at pair ${index}`,
        Date.parse(previous.created_at) >= Date.parse(row.created_at),
      );
    });
  }
}
