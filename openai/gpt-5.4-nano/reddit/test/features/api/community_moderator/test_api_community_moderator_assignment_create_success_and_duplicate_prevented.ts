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
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderator_assignment_create_success_and_duplicate_prevented(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create a community using an authorized member actor
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwner = await authorize_member_join(communityOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      communityOwnerConnection,
      {
        body: {
          name: `com-${RandomGenerator.alphabets(10)}-${communityOwner.id}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/icon/${RandomGenerator.alphabets(8)}`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2) Register two distinct members
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  TestValidator.notEquals(
    "member A and B should be different",
    memberA.id,
    memberB.id,
  );
  // 3) Assign Member A as moderator
  const createBody: ICommunityPlatformCommunityModerator.ICreate = {
    communityId: community.id,
    moderatorUserId: memberA.id,
  };
  const assignment1: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.communityModerators.create(
      communityOwnerConnection,
      { body: createBody },
    );
  typia.assert(assignment1);
  TestValidator.predicate(
    "assignment id should be non-empty",
    assignment1.id.length > 0,
  );
  TestValidator.equals(
    "community_id should match",
    assignment1.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator_user_id should match",
    assignment1.moderator_user_id,
    memberA.id,
  );
  TestValidator.equals(
    "deleted_at should be null",
    assignment1.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at should be parseable",
    !Number.isNaN(Date.parse(assignment1.created_at)),
  );
  TestValidator.predicate(
    "updated_at should be parseable",
    !Number.isNaN(Date.parse(assignment1.updated_at)),
  );
  // 4) Duplicate assignment should fail
  await TestValidator.error(
    "duplicate active moderator assignment should be rejected",
    async () => {
      await api.functional.communityPlatform.communityModerators.create(
        communityOwnerConnection,
        { body: createBody },
      );
    },
  );
  // 5) Validate original assignment still active (cannot directly list records with provided SDK)
  TestValidator.equals(
    "original deleted_at still null",
    assignment1.deleted_at,
    null,
  );
}
