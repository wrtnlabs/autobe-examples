import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalGuest";

export async function test_api_guest_session_join_bind_invalid_user(
  connection: api.IConnection,
) {
  // Purpose:
  // This test verifies the guest-join flow for POST /auth/guest/join using the
  // official request DTO. The original requested scenario (binding a guest
  // session to a non-existent user_id via the request body) is not implementable
  // because ICommunityPortalGuest.ICreate is an empty object (clients MUST NOT
  // supply user_id). Sending non-existent properties would violate the schema
  // and the absolute prohibition against inventing properties. Therefore, this
  // test focuses on the permitted client behavior: creating a guest session and
  // validating the returned ICommunityPortalGuest.IAuthorized response.

  // 1) Prepare a compliant request body (ICreate is an empty DTO)
  const requestBody = {} satisfies ICommunityPortalGuest.ICreate;

  // 2) Call the API and capture the response
  const authorized: ICommunityPortalGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // 3) Validate the full response shape and formats (typia.assert performs
  //    comprehensive runtime validation, including UUID and date-time formats)
  typia.assert(authorized);

  // 4) Business-level assertions:
  // - guest_token must be a non-empty string
  TestValidator.predicate(
    "guest_token should be a non-empty string",
    typeof authorized.guest_token === "string" &&
      authorized.guest_token.length > 0,
  );

  // - id should be a UUID (typia.assert already checked this), but assert
  //   presence nonetheless for readable test failures
  TestValidator.predicate("authorized.id is present", !!authorized.id);

  // - created_at must exist
  TestValidator.predicate("created_at is present", !!authorized.created_at);

  // - token.access must be present and non-empty
  TestValidator.predicate(
    "token.access exists",
    !!(
      authorized.token &&
      typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0
    ),
  );

  // Note about original intent:
  // The initial scenario requested a negative test where the client binds the
  // guest session to a non-existent user_id and expects rejection. Because the
  // request DTO forbids client-supplied user_id, that negative test is not
  // implementable without violating schema constraints. If in the future the
  // API exposes a separate binding mechanism that accepts user_id from clients,
  // a dedicated test should be added to assert rejection for invalid UUIDs and
  // non-existent user references.
}
