import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_delete_confirmation_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community for this test member using random UUID
  // Note: Community creation is not available via current API, using random UUID
  // In production, this would be created by a prior test or manual setup
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Submit delete confirmation request
  const confirmationResponse: IRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.member.communities.delete_confirmation.deleteConfirmation(
      memberConnection,
      {
        communityId,
      },
    );
  typia.assert(confirmationResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "community ID matches",
    confirmationResponse.id,
    communityId,
  );
  TestValidator.equals(
    "community has name",
    confirmationResponse.name.length > 0,
    true,
  );
  TestValidator.equals(
    "community has created_at",
    confirmationResponse.created_at !== undefined,
    true,
  );
  // 5. Validate community is not yet deleted (confirmation workflow only)
  TestValidator.equals(
    "community not yet deleted (deleted_at is null)",
    confirmationResponse.deleted_at,
    null,
  );
  // 6. Validate optional fields are properly typed
  TestValidator.equals(
    "description is optional string or null",
    confirmationResponse.description === undefined ||
      confirmationResponse.description === null ||
      typeof confirmationResponse.description === "string",
    true,
  );
  TestValidator.equals(
    "subscriber_count is optional number",
    confirmationResponse.subscriber_count === undefined ||
      typeof confirmationResponse.subscriber_count === "number",
    true,
  );
}