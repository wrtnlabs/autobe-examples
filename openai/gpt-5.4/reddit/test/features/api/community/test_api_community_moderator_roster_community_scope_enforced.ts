import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
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

export async function test_api_community_moderator_roster_community_scope_enforced(
  connection: api.IConnection,
): Promise<void> {
  const ownerAConnection: api.IConnection = { host: connection.host };
  const ownerAAuthorized = await authorize_member_join(ownerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAAuthorized);
  const communityAModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  const communityAModeratorAuthorized = await authorize_member_join(
    communityAModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(communityAModeratorAuthorized);
  const ownerBConnection: api.IConnection = { host: connection.host };
  const ownerBAuthorized = await authorize_member_join(ownerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerBAuthorized);
  const communityA =
    await generate_random_community_platform_member_communities_create(
      ownerAConnection,
      {},
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_community_platform_member_communities_create(
      ownerBConnection,
      {},
    );
  typia.assert(communityB);
  const moderatorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerAConnection,
      {
        params: {
          communitySlug: communityA.slug,
        },
        body: {
          member_code: communityAModeratorAuthorized.code,
        },
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "moderator assignment belongs to target community",
    moderatorAssignment.community.id,
    communityA.id,
  );
  TestValidator.equals(
    "assigned moderator matches invited member code",
    moderatorAssignment.member.code,
    communityAModeratorAuthorized.code,
  );
  TestValidator.notEquals(
    "separate communities have different ids",
    communityA.id,
    communityB.id,
  );
  TestValidator.notEquals(
    "community owners differ across communities",
    communityA.member.id,
    communityB.member.id,
  );
  const page = 1 satisfies number as number;
  const limit = 10 satisfies number as number;
  await TestValidator.httpError(
    "moderator roster access is rejected for moderator from another community",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.index(
        ownerBConnection,
        {
          communityId: communityA.id,
          body: {
            page,
            limit,
          } satisfies ICommunityPlatformCommunityModerator.IRequest,
        },
      );
    },
  );
}
