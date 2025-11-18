import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

export async function test_api_guest_registration_special_characters_email(
  connection: api.IConnection,
) {
  // Test 1: Plus addressing format (user+tag@example.com)
  const plusEmail = `user+special${RandomGenerator.alphaNumeric(3)}@example.com`;

  const plusResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: plusEmail,
        password: "password123",
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(plusResponse);
  TestValidator.predicate(
    "plus address registration successful",
    plusResponse.id !== null,
  );
  TestValidator.equals(
    "plus address email normalized",
    plusResponse.email,
    plusEmail.toLowerCase(),
  );
  TestValidator.predicate(
    "access token provided",
    plusResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token provided",
    plusResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "timestamps recorded",
    plusResponse.created_at !== null && plusResponse.updated_at !== null,
  );

  // Test 2: Dots and numbers in local part (user.name123@example.com)
  const dotsNumbersEmail = `user.name${RandomGenerator.alphaNumeric(3)}@example.com`;

  const dotsResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: dotsNumbersEmail,
        password: "password456",
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(dotsResponse);
  TestValidator.predicate(
    "dots and numbers registration successful",
    dotsResponse.id !== null,
  );
  TestValidator.equals(
    "dots and numbers email normalized",
    dotsResponse.email,
    dotsNumbersEmail.toLowerCase(),
  );
  TestValidator.predicate(
    "tokens generated",
    dotsResponse.token.access.length > 0 &&
      dotsResponse.token.refresh.length > 0,
  );

  // Test 3: Hyphens in domain (user@sub-domain.example.com)
  const hyphenDomainEmail = `user${RandomGenerator.alphaNumeric(4)}@sub-domain-test.example.com`;

  const hyphenResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: hyphenDomainEmail,
        password: "password789",
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(hyphenResponse);
  TestValidator.predicate(
    "hyphen domain registration successful",
    hyphenResponse.id !== null,
  );
  TestValidator.equals(
    "hyphen domain email normalized",
    hyphenResponse.email,
    hyphenDomainEmail.toLowerCase(),
  );
  TestValidator.predicate(
    "session tracking timestamp available",
    hyphenResponse.created_at !== null,
  );

  // Test 4: Multiple dots and numbers combination (test.user.123@example.com)
  const complexEmail = `test.user.${RandomGenerator.alphaNumeric(3)}@example.com`;

  const complexResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: complexEmail,
        password: "password101",
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(complexResponse);
  TestValidator.predicate(
    "complex email registration successful",
    complexResponse.id !== null,
  );
  TestValidator.equals(
    "complex email normalized to lowercase",
    complexResponse.email,
    complexEmail.toLowerCase(),
  );
  TestValidator.predicate(
    "jwt expiration times set",
    complexResponse.token.expired_at !== null &&
      complexResponse.token.refreshable_until !== null,
  );

  // Test 5: Plus addressing with numbers (user+001@example.com)
  const plusNumberEmail = `user+${RandomGenerator.alphaNumeric(3)}@example.com`;

  const plusNumberResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: plusNumberEmail,
        password: "password202",
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(plusNumberResponse);
  TestValidator.predicate(
    "plus with number registration successful",
    plusNumberResponse.id !== null,
  );
  TestValidator.predicate(
    "jwt tokens include access and refresh",
    plusNumberResponse.token.access.length > 0 &&
      plusNumberResponse.token.refresh.length > 0,
  );
  TestValidator.equals(
    "plus number email case normalized",
    plusNumberResponse.email,
    plusNumberEmail.toLowerCase(),
  );
}
