import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_member_verify_email_success(
  connection: api.IConnection,
) {
  // 1) Register a new member using the provided SDK function
  const createBody = {
    username: `test_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const authorized: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: createBody });
  typia.assert(authorized);

  // Additional sanity checks
  TestValidator.predicate(
    "created member id is present",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.predicate(
    "registration returned access token",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );

  // 2) Construct verify-email request.
  // NOTE: The SDK expects ICommunityPortalMember.IVerifyEmail as the request DTO
  // according to the provided materials. Although semantically unusual (a
  // token would typically be used), the test sends the required shape to
  // comply exactly with the SDK and DTO definitions.
  const verifyBody = {
    success: true,
    message: "Verification consumed by test",
    userId: authorized.id,
  } satisfies ICommunityPortalMember.IVerifyEmail;

  const result: ICommunityPortalMember.IVerifyEmailResult =
    await api.functional.auth.member.verify_email.verifyEmail(connection, {
      body: verifyBody,
    });
  typia.assert(result);

  // 3) Business validations
  TestValidator.predicate(
    "verify-email: success flag is true",
    result.success === true,
  );

  if (result.user !== undefined && result.user !== null) {
    typia.assert(result.user);
    TestValidator.equals(
      "verified user id matches created id",
      result.user.id,
      authorized.id,
    );
  }
}
