import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionComment";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderation_action_comment_cross_community_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberOneConnection: api.IConnection = { host: connection.host };
  const memberOneJoin = await authorize_member_join(memberOneConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberOneJoin);
  const memberTwoConnection: api.IConnection = { host: connection.host };
  const memberTwoJoin = await authorize_member_join(memberTwoConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberTwoJoin);
  const communityOne =
    await generate_random_community_platform_member_communities_create(
      memberOneConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(12)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(communityOne);
  const communityTwo =
    await generate_random_community_platform_member_communities_create(
      memberTwoConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(12)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(communityTwo);
  TestValidator.notEquals(
    "communities must be distinct",
    communityOne.id,
    communityTwo.id,
  );
  TestValidator.notEquals(
    "community slugs must be distinct",
    communityOne.slug,
    communityTwo.slug,
  );
  TestValidator.notEquals(
    "members must be distinct",
    memberOneJoin.id,
    memberTwoJoin.id,
  );
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();
  const moderationActionCommentId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "community one rejects nonexistent moderation action comment lookup",
    404,
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationActions.comments.at(
        adminConnection,
        {
          communityId: communityOne.id,
          moderationActionId,
          moderationActionCommentId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "community two rejects reused identifiers from another community scope",
    404,
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationActions.comments.at(
        adminConnection,
        {
          communityId: communityTwo.id,
          moderationActionId,
          moderationActionCommentId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "broken parent-child combination remains not found in first community",
    404,
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationActions.comments.at(
        adminConnection,
        {
          communityId: communityOne.id,
          moderationActionId: typia.random<string & tags.Format<"uuid">>(),
          moderationActionCommentId,
        },
      );
    },
  );
}
