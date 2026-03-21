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

export async function test_api_member_join_success_complete_profile(
  connection: api.IConnection,
): Promise<void> {
  // Generate test data with all fields populated
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const avatarImage = typia.random<string & tags.Format<"url">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create join request with all fields
  const joinBody: IErpHrmMember.IJoin = {
    email,
    password,
    displayName,
    phoneNumber,
    avatarImage,
    href,
    referrer,
    ip,
  };
  // Execute join API
  const response = await api.functional.erpHrm.auth.member.join(connection, {
    body: joinBody,
  });
  // Validate response structure
  typia.assert(response);
  // Validate member profile fields match request
  TestValidator.equals("email matches", response.email, email);
  TestValidator.equals(
    "displayName matches",
    response.display_name,
    displayName,
  );
  TestValidator.equals(
    "phoneNumber matches",
    response.phone_number ?? null,
    phoneNumber,
  );
  TestValidator.equals(
    "avatarImage matches",
    response.avatar_image ?? null,
    avatarImage,
  );
  // Validate UUID is generated
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
  // Validate timestamps are set
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(response.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(response.updated_at).getTime()),
  );
  TestValidator.equals("deleted_at is null", response.deleted_at, null);
  // Validate JWT tokens are returned
  TestValidator.predicate(
    "access token exists",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(new Date(response.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(new Date(response.token.refreshable_until).getTime()),
  );
  // Validate token expiration timing (access token should expire before refreshable_until)
  const expiredAtTime = new Date(response.token.expired_at).getTime();
  const refreshableUntilTime = new Date(
    response.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "access expires before refresh deadline",
    expiredAtTime < refreshableUntilTime,
  );
}
