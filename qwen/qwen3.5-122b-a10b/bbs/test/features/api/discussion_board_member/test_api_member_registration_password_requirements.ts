import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_password_requirements(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate valid registration data with password meeting security requirements (min 8 chars)
  const password = RandomGenerator.alphaNumeric(16); // 16 chars, meets MinLength<8>
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: password,
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  // Register member using utility function
  const output: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, { body });
  // Validate response structure
  typia.assert(output);
  // Validate member profile fields
  TestValidator.equals("member id is uuid", typeof output.id, "string");
  TestValidator.equals("email matches input", output.email, body.email);
  TestValidator.equals(
    "display name matches",
    output.display_name,
    body.displayName,
  );
  TestValidator.predicate(
    "ban status is active",
    output.ban_status === "active",
  );
  TestValidator.equals("bio is null initially", output.bio, null);
  // Validate authentication tokens
  TestValidator.equals("token type is Bearer", output.token_type, "Bearer");
  TestValidator.equals("expires in is 3600 seconds", output.expires_in, 3600);
  TestValidator.predicate(
    "access token exists",
    output.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.refresh_token.length > 0,
  );
  // Validate IAuthorizationToken structure
  TestValidator.predicate(
    "token.access exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh exists",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is date-time",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until is date-time",
    output.token.refreshable_until.length > 0,
  );
  // Validate article and comment counts are initialized to 0
  TestValidator.equals(
    "article count initialized to 0",
    output.article_count,
    0,
  );
  TestValidator.equals(
    "comment count initialized to 0",
    output.comment_count,
    0,
  );
}
