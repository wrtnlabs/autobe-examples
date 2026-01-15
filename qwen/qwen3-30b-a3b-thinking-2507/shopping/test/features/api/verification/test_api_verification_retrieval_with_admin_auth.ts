import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerificationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_verification_retrieval_with_admin_auth(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  const analyticsData: IShoppingMallEmailVerificationToken =
    await api.functional.shoppingMall.admin.verification.analytics.tokens.index(
      adminConnection,
    );
  typia.assert(analyticsData);
  TestValidator.predicate(
    "successRate should be between 0 and 1",
    analyticsData.successRate >= 0 && analyticsData.successRate <= 1,
  );
  TestValidator.predicate(
    "avgValidityDuration should match ISO 8601 duration format",
    /^P([0-9]+Y)?([0-9]+M)?([0-9]+D)?(T([0-9]+H)?([0-9]+M)?([0-9]+S)?)?$/.test(
      analyticsData.avgValidityDuration,
    ),
  );
  TestValidator.predicate(
    "failurePatterns should contain at least one item",
    analyticsData.failurePatterns.length > 0,
  );
  TestValidator.predicate(
    "totalVerificationAttempts should be non-negative",
    analyticsData.totalVerificationAttempts >= 0,
  );
  TestValidator.predicate(
    "verificationPeriodStart should be a valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      analyticsData.verificationPeriodStart,
    ),
  );
  TestValidator.predicate(
    "verificationPeriodEnd should be a valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      analyticsData.verificationPeriodEnd,
    ),
  );
}
