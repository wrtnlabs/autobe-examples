import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for the new member
  const memberConnection: api.IConnection = { host: connection.host };
  // Prepare explicit join credentials for deterministic validation
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register and authenticate via the utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(member);
  // Validate member identity fields match submitted values
  TestValidator.equals("email matches submitted value", member.email, email);
  TestValidator.equals(
    "display_name matches submitted value",
    member.display_name,
    displayName,
  );
  // Validate default profile values for newly registered members
  TestValidator.equals(
    "avatar_image is null for new member",
    member.avatar_image,
    null,
  );
  TestValidator.equals(
    "phone_number is null for new member",
    member.phone_number,
    null,
  );
  // Validate timestamp consistency for newly created account
  TestValidator.equals(
    "updated_at equals created_at for new account",
    member.created_at,
    member.updated_at,
  );
  // Validate JWT token pair integrity
  TestValidator.predicate(
    "access token is non-empty",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    member.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access and refresh tokens are distinct",
    member.token.access,
    member.token.refresh,
  );
  // Validate token expiration chronology
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(member.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(member.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until after expired_at",
    member.token.refreshable_until > member.token.expired_at,
  );
  // Validate new members have no organization affiliations yet
  TestValidator.equals(
    "organizations is empty array",
    member.organizations,
    [],
  );
  // Validate token is automatically applied to connection for immediate authenticated requests
  TestValidator.equals(
    "Authorization header set on connection",
    memberConnection.headers?.Authorization,
    member.token.access,
  );
}
