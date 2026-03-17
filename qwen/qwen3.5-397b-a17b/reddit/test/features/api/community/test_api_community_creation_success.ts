import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create a new community using the authenticated member connection
  const communityInput: IRedditCloneCommunity.ICreate = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon: typia.assert<string & tags.MaxLength<80000>>(typia.random<string & tags.Format<"uri">>()),
  } satisfies IRedditCloneCommunity.ICreate;
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_communities_create(memberConnection, {
      body: communityInput,
    });
  typia.assert(community);
  // 3. Verify community was created with correct properties
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityInput.name,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    communityInput.description,
  );
  TestValidator.equals(
    "community icon matches",
    community.icon,
    communityInput.icon,
  );
  // 4. Verify owner reference points to the creating member
  TestValidator.equals(
    "owner id matches member id",
    community.owner.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "owner username matches",
    community.owner.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "owner display_name matches",
    community.owner.display_name,
    memberAuth.display_name,
  );
  // 5. Verify subscriber_count initialized to 1
  TestValidator.equals("subscriber count is 1", community.subscriber_count, 1);
  // 6. Verify deleted_at is null (active community)
  TestValidator.equals("deleted_at is null", community.deleted_at, null);
}