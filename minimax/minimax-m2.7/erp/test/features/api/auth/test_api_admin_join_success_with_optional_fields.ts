import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_success_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Prepare test data with required and optional fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const phone = RandomGenerator.mobile();
  const avatarUri = typia.random<string & tags.Format<"uri">>();
  // Call join endpoint with all optional fields
  const admin = await api.functional.erpHrm.auth.admin.join(connection, {
    body: {
      email,
      password,
      displayName,
      phone,
      avatarUri,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // Validate response structure with typia.assert
  typia.assert(admin);
  // Validate token expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(admin.token.expired_at);
  const refreshableUntil = new Date(admin.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  // Validate admin profile matches submitted data
  TestValidator.equals("email matches", admin.email, email);
  TestValidator.equals("display_name matches", admin.display_name, displayName);
  // Validate optional fields are correctly returned
  TestValidator.equals("phone matches", admin.phone, phone);
  TestValidator.equals("avatarUri matches", admin.avatarUri, avatarUri);
}
