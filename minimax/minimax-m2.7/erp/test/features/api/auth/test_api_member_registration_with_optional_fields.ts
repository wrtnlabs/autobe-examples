import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Register with optional fields (avatar_uri and phone)
  const emailWithOptional = typia.random<string & tags.Format<"email">>();
  const passwordWithOptional = RandomGenerator.alphaNumeric(16);
  const displayNameWithOptional = RandomGenerator.name();
  const avatarUri = "https://example.com/avatar.png";
  const phone = RandomGenerator.mobile();
  const hrefWithOptional = typia.random<string & tags.Format<"uri">>();
  const referrerWithOptional = typia.random<string & tags.Format<"uri">>();
  const outputWithOptional = await api.functional.erpHrm.auth.member.join(
    connection,
    {
      body: {
        email: emailWithOptional,
        password: passwordWithOptional,
        display_name: displayNameWithOptional,
        avatar_uri: avatarUri,
        phone: phone,
        href: hrefWithOptional,
        referrer: referrerWithOptional,
      } satisfies IErpHrmMember.IJoin,
    },
  );
  typia.assert(outputWithOptional);
  TestValidator.equals(
    "email matches input",
    outputWithOptional.email,
    emailWithOptional,
  );
  TestValidator.equals(
    "display_name matches input",
    outputWithOptional.display_name,
    displayNameWithOptional,
  );
  TestValidator.equals(
    "avatar_uri stored correctly",
    outputWithOptional.avatar_uri,
    avatarUri,
  );
  TestValidator.equals(
    "phone stored correctly",
    outputWithOptional.phone,
    phone,
  );
  TestValidator.predicate(
    "member id is valid UUID",
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      outputWithOptional.id,
    ),
  );
  // Validate JWT token structure
  TestValidator.predicate(
    "token exists",
    outputWithOptional.token !== undefined,
  );
  TestValidator.predicate(
    "access token is non-empty string",
    outputWithOptional.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    outputWithOptional.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      outputWithOptional.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      outputWithOptional.token.refreshable_until,
    ),
  );
  // Test 2: Register without optional fields - validate they're null
  const emailWithoutOptional = typia.random<string & tags.Format<"email">>();
  const passwordWithoutOptional = RandomGenerator.alphaNumeric(16);
  const displayNameWithoutOptional = RandomGenerator.name();
  const hrefWithoutOptional = typia.random<string & tags.Format<"uri">>();
  const referrerWithoutOptional = typia.random<string & tags.Format<"uri">>();
  const outputWithoutOptional = await api.functional.erpHrm.auth.member.join(
    connection,
    {
      body: {
        email: emailWithoutOptional,
        password: passwordWithoutOptional,
        display_name: displayNameWithoutOptional,
        href: hrefWithoutOptional,
        referrer: referrerWithoutOptional,
      } satisfies IErpHrmMember.IJoin,
    },
  );
  typia.assert(outputWithoutOptional);
  TestValidator.equals(
    "email matches",
    outputWithoutOptional.email,
    emailWithoutOptional,
  );
  TestValidator.equals(
    "display_name matches",
    outputWithoutOptional.display_name,
    displayNameWithoutOptional,
  );
  TestValidator.equals(
    "avatar_uri is null when not provided",
    outputWithoutOptional.avatar_uri,
    null,
  );
  TestValidator.equals(
    "phone is null when not provided",
    outputWithoutOptional.phone,
    null,
  );
  // Test 3: Display name with special characters and unicode
  const emailSpecialChars = typia.random<string & tags.Format<"email">>();
  const passwordSpecialChars = RandomGenerator.alphaNumeric(16);
  const hrefSpecialChars = typia.random<string & tags.Format<"uri">>();
  const referrerSpecialChars = typia.random<string & tags.Format<"uri">>();
  // Various special character and unicode names
  const specialNames = [
    "José García",
    "Müller",
    "田中太郎",
    "محمد",
    "John O'Connor",
    "Test_User-123",
  ];
  for (const specialName of specialNames) {
    const outputSpecialName = await api.functional.erpHrm.auth.member.join(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: passwordSpecialChars,
          display_name: specialName,
          href: hrefSpecialChars,
          referrer: referrerSpecialChars,
        } satisfies IErpHrmMember.IJoin,
      },
    );
    typia.assert(outputSpecialName);
    TestValidator.equals(
      "unicode/special chars display_name stored correctly",
      outputSpecialName.display_name,
      specialName,
    );
  }
  // Test 4: Verify token can be used for authenticated operations
  const emailForAuth = typia.random<string & tags.Format<"email">>();
  const passwordForAuth = RandomGenerator.alphaNumeric(16);
  const displayNameForAuth = RandomGenerator.name();
  const hrefForAuth = typia.random<string & tags.Format<"uri">>();
  const referrerForAuth = typia.random<string & tags.Format<"uri">>();
  const authOutput = await api.functional.erpHrm.auth.member.join(connection, {
    body: {
      email: emailForAuth,
      password: passwordForAuth,
      display_name: displayNameForAuth,
      href: hrefForAuth,
      referrer: referrerForAuth,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(authOutput);
  // Create authenticated connection with the token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${authOutput.token.access}`,
  };
  // Validate token expiration is reasonable (not expired, not too far in future)
  const expirationTime = new Date(authOutput.token.expired_at);
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  TestValidator.predicate("token not expired", expirationTime > now);
  TestValidator.predicate(
    "token expires within reasonable timeframe (< 1 hour)",
    expirationTime <= oneHourFromNow,
  );
  TestValidator.predicate(
    "token has meaningful expiration (> 5 minutes)",
    expirationTime >= fiveMinutesFromNow,
  );
}
