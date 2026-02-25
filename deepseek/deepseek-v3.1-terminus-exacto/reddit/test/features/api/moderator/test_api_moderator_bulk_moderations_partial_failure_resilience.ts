import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionLog";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_moderator_bulk_moderations_partial_failure_resilience(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Community Owner",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "mod123",
      username: RandomGenerator.alphabets(8),
      display_name: "Test Moderator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const community1 =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  const post1 = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community1.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community2.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  const moderatorData = {
    id: moderatorAuth.id,
    email: moderatorAuth.email,
    username: moderatorAuth.username,
    display_name: moderatorAuth.display_name,
    avatar_url: (moderatorAuth.avatar_url ?? null) as
      | (string & tags.Format<"uri">)
      | null,
    is_active: moderatorAuth.is_active,
    permission_level: moderatorAuth.permission_level,
    last_login_at: (moderatorAuth.last_login_at ?? null) as
      | (string & tags.Format<"date-time">)
      | null,
  } satisfies ICommunityPlatformModerator.ISummary;
  const userSummary = {
    id: userAuth.id,
    username: userAuth.username,
    display_name: userAuth.display_name,
    avatar_url: userAuth.avatar_url as (string & tags.Format<"uri">) | null,
    karma: userAuth.karma,
    created_at: userAuth.created_at,
  } satisfies ICommunityPlatformUser.ISummary;
  const community1IconUrl = (community1.icon_url ?? null) as
    | (string & tags.Format<"uri">)
    | null;
  const community2IconUrl = (community2.icon_url ?? null) as
    | (string & tags.Format<"uri">)
    | null;
  const communityOwner = {
    id: typia.random<string & tags.Format<"uuid">>(),
    username: "admin",
    display_name: "Community Owner",
    avatar_url: null as (string & tags.Format<"uri">) | null,
    karma: 0,
    created_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUser.ISummary;
  const community1Summary = {
    id: community1.id,
    name: community1.name,
    description: community1.description,
    icon_url: community1IconUrl,
    owner: communityOwner,
    created_at: community1.created_at,
  } satisfies ICommunityPlatformCommunity.ISummary;
  const community2Summary = {
    id: community2.id,
    name: community2.name,
    description: community2.description,
    icon_url: community2IconUrl,
    owner: userSummary,
    created_at: community2.created_at,
  } satisfies ICommunityPlatformCommunity.ISummary;
  const post1Summary = {
    id: post1.id,
    title: post1.title,
    post_type: post1.post_type,
    author: userSummary,
    community: {
      ...community1Summary,
      icon_url: community1IconUrl,
    } satisfies ICommunityPlatformCommunity.ISummary,
    created_at: post1.created_at,
  } satisfies ICommunityPlatformPost.ISummary;
  const post2Summary = {
    id: post2.id,
    title: post2.title,
    post_type: post2.post_type,
    author: userSummary,
    community: {
      ...community2Summary,
      icon_url: community2IconUrl,
    } satisfies ICommunityPlatformCommunity.ISummary,
    created_at: post2.created_at,
  } satisfies ICommunityPlatformPost.ISummary;
  const validModerationAction: ICommunityPlatformModerationActionLog = {
    id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "post_delete",
    action_description: "Valid moderation action",
    action_details: "Testing successful moderation",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    moderator: moderatorData,
    community: community1Summary,
    targetUser: userSummary,
    targetPost: post1Summary,
    targetComment: null,
    report: null,
  } satisfies ICommunityPlatformModerationActionLog;
  const validResult =
    await api.functional.communityPlatform.moderator.bulk.moderations.create(
      moderatorConnection,
      {
        body: validModerationAction,
      },
    );
  typia.assert(validResult);
  TestValidator.equals(
    "valid action processed",
    validResult.action_type,
    "post_delete",
  );
  const invalidModerationAction: ICommunityPlatformModerationActionLog = {
    ...validModerationAction,
    id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "ban_user",
    action_description: "Attempting to ban community owner - should fail",
    targetUser: communityOwner,
  } satisfies ICommunityPlatformModerationActionLog;
  await TestValidator.error("banning community owner should fail", async () => {
    await api.functional.communityPlatform.moderator.bulk.moderations.create(
      moderatorConnection,
      {
        body: invalidModerationAction,
      },
    );
  });
  const unauthorizedAction: ICommunityPlatformModerationActionLog = {
    ...validModerationAction,
    id: typia.random<string & tags.Format<"uuid">>(),
    action_description: "Moderation in unauthorized community - should fail",
    community: community2Summary,
    targetPost: post2Summary,
  } satisfies ICommunityPlatformModerationActionLog;
  await TestValidator.error(
    "moderation in unauthorized community should fail",
    async () => {
      await api.functional.communityPlatform.moderator.bulk.moderations.create(
        moderatorConnection,
        {
          body: unauthorizedAction,
        },
      );
    },
  );
  const subsequentAction: ICommunityPlatformModerationActionLog = {
    ...validModerationAction,
    id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "comment_delete",
    action_description: "Subsequent valid action",
  } satisfies ICommunityPlatformModerationActionLog;
  const subsequentResult =
    await api.functional.communityPlatform.moderator.bulk.moderations.create(
      moderatorConnection,
      {
        body: subsequentAction,
      },
    );
  typia.assert(subsequentResult);
  TestValidator.equals(
    "subsequent action processed",
    subsequentResult.action_type,
    "comment_delete",
  );
  TestValidator.predicate(
    "system resilient to partial failures",
    subsequentResult.id !== undefined,
  );
}
