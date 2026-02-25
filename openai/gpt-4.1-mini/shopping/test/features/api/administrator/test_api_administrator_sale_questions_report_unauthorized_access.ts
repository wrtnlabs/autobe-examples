import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleQuestionReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestionReport";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSaleQuestionReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_questions_report_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the behavior when an unauthorized user attempts to access the sales questions report endpoint without valid administrator credentials.
  // No admin login or join is performed to simulate unauthorized access.
  const baseConnection: api.IConnection = { host: connection.host };
  // Prepare a minimal valid request body for sales questions report filter
  const body: IShoppingMallSaleQuestionReport.IRequest = {};
  // Attempt to access the PATCH /shoppingMall/administrator/reports/sale-questions endpoint using base connection without authorization
  await TestValidator.httpError(
    "unauthorized access to sales questions report returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.reports.sale_questions.index(
        baseConnection,
        { body },
      );
    },
  );
}
