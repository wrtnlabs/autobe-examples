import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function test_api_community_member_password_reset_request_existing_user(
  connection: api.IConnection,
) {
  // 1) Create a fresh community member account via join
  const email = `user-${RandomGenerator.alphaNumeric(6)}@example.test`;
  const username = RandomGenerator.alphaNumeric(8);
  const password = "Passw0rd1"; // meets min length and pattern requirements

  const joinBody = {
    email,
    username,
    password,
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const auth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(auth);

  // 2) Request password reset for the created email
  const resetRequestBody = {
    email,
  } satisfies ICommunityBbsCommunityMember.IRequestPasswordReset;

  const resetResponse: ICommunityBbsCommunityMember.IResetRequestResponse =
    await api.functional.auth.communityMember.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetResponse);

  // 3) Business validations - response is opaque and success acknowledged
  TestValidator.predicate(
    "password reset request accepted",
    resetResponse.success === true,
  );

  TestValidator.predicate(
    "response message is non-disclosing and does not contain the email",
    typeof resetResponse.message === "string" &&
      !resetResponse.message.includes(email),
  );

  // 4) Repeat request immediately to assert consistent/opaque acknowledgement
  const resetResponse2: ICommunityBbsCommunityMember.IResetRequestResponse =
    await api.functional.auth.communityMember.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetResponse2);

  TestValidator.predicate(
    "repeated reset request returns opaque acknowledgement",
    resetResponse2.success === true &&
      typeof resetResponse2.message === "string",
  );
}
