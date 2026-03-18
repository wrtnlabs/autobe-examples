import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_with_optional_profile_fields(
  connection: api.IConnection,
): Promise<void> {
  // Prepare registration data with optional profile fields
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  const testDisplayName = RandomGenerator.name();
  const testAvatarUrl = typia.random<string & tags.Format<"uri">>();
  const testPhoneNumber = RandomGenerator.mobile();
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();
  // Create member connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Register new member with optional profile fields using utility function
  const authorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: testEmail,
        password: testPassword,
        display_name: testDisplayName,
        avatar_url: testAvatarUrl,
        phone_number: testPhoneNumber,
        href: testHref,
        referrer: testReferrer,
      } satisfies IHrmPlatformMember.IJoin,
    });
  // Validate response structure
  typia.assert(authorized);
  // Verify member profile information matches input
  TestValidator.equals("email matches input", authorized.email, testEmail);
  TestValidator.equals(
    "display name matches input",
    authorized.displayName,
    testDisplayName,
  );
  TestValidator.equals(
    "avatar URL matches input",
    authorized.avatarUrl,
    testAvatarUrl,
  );
  TestValidator.equals(
    "phone number matches input",
    authorized.phoneNumber,
    testPhoneNumber,
  );
  // Verify member summary contains profile data
  TestValidator.equals(
    "member summary email",
    authorized.member.email,
    testEmail,
  );
  TestValidator.equals(
    "member summary display name",
    authorized.member.display_name,
    testDisplayName,
  );
  TestValidator.equals(
    "member summary avatar URL",
    authorized.member.avatar_url,
    testAvatarUrl,
  );
  TestValidator.equals(
    "member summary phone number",
    authorized.member.phone_number,
    testPhoneNumber,
  );
  // Verify JWT token structure
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is future date",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is future date",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
  // Verify timestamps
  TestValidator.predicate(
    "created_at is valid date",
    new Date(authorized.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(authorized.updatedAt).getTime() > 0,
  );
  TestValidator.equals(
    "created_at equals updated_at on creation",
    authorized.createdAt,
    authorized.updatedAt,
  );
  // Verify account is active (not deleted)
  TestValidator.equals(
    "deletedAt is null for new account",
    authorized.deletedAt,
    null,
  );
  // Verify member connection was updated with authorization token
  TestValidator.predicate(
    "connection has authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
}
