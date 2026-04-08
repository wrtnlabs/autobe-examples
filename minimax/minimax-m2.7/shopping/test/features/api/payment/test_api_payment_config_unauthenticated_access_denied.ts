import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallPaymentConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPaymentConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_payment_config_unauthenticated_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Test that unauthenticated requests to payment config endpoint are denied
  // The endpoint requires admin authentication, so unauthenticated calls should fail
  await TestValidator.httpError(
    "unauthenticated access should be denied with 401 or 403",
    [401, 403],
    async () =>
      await api.functional.ecommerceMall.admin.payments.config.at(connection),
  );
}
