import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_moderators_update_owner_adds_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create owner as an authenticated member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(ownerMember);
  // 2) Create community owned by the authenticated member
  const community = await generate_random_community_platform_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(12),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphabets(6)}`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Create a second member to add as moderator
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(targetMember);
  const moderatorUpdateRequest: ICommunityPlatformCommunityModerator.IRequest =
    {
      communityId: community.id,
      operation: "add",
      targetMemberIds: [targetMember.id],
      page: 1,
      limit: 100,
    };
  // 4) Add moderator
  const firstUpdate =
    await api.functional.communityPlatform.communityModerators.update(
      ownerConnection,
      {
        body: moderatorUpdateRequest,
      },
    );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "added moderator id",
    firstUpdate.moderator.id,
    targetMember.id,
  );
  TestValidator.equals(
    "added moderator is active",
    firstUpdate.deleted_at,
    null,
  );
  // 5) Idempotency: add same moderator again
  const secondUpdate =
    await api.functional.communityPlatform.communityModerators.update(
      ownerConnection,
      {
        body: moderatorUpdateRequest,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "idempotent moderator id",
    secondUpdate.moderator.id,
    targetMember.id,
  );
  TestValidator.equals(
    "idempotent moderator still active",
    secondUpdate.deleted_at,
    null,
  );
}
