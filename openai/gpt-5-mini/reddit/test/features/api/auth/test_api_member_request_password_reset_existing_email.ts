import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function test_api_member_request_password_reset_existing_email(
  connection: api.IConnection,
) {
  // 1) Prepare a unique, valid test account payload
  const email = typia.random<string & tags.Format<"email">>();
  const rawName = RandomGenerator.name(1);
  const username = `${rawName.replace(/\s+/g, "_").toLowerCase()}_${Date.now().toString().slice(-6)}`;

  // Use a reasonably strong test password pattern to avoid server-side rejection
  const createBody = {
    username,
    email,
    password: `P@ssW0rd!${RandomGenerator.alphaNumeric(4)}`,
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  // 2) Register the member (dependency)
  const created: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createBody,
    });
  // Runtime type validation
  typia.assert(created);

  // Business assertion: the created account has a non-empty id
  TestValidator.predicate(
    "created user has id",
    typeof created.id === "string" && created.id.length > 0,
  );

  // 3) Request password reset for the registered email
  const requestBody = {
    email,
  } satisfies ICommunityPortalMember.IRequestPasswordReset;
  const response: ICommunityPortalMember.IPasswordResetRequested =
    await api.functional.auth.member.password.request_reset.requestPasswordReset(
      connection,
      {
        body: requestBody,
      },
    );
  // Runtime type validation
  typia.assert(response);

  // Business-level validations:
  // - The API returns a generic confirmation message (non-empty string)
  // - If a request_id is returned, it must be a string; otherwise undefined
  TestValidator.predicate(
    "reset response contains message",
    typeof response.message === "string" && response.message.length > 0,
  );
  TestValidator.predicate(
    "request_id is string when present or undefined",
    response.request_id === undefined ||
      typeof response.request_id === "string",
  );
}
