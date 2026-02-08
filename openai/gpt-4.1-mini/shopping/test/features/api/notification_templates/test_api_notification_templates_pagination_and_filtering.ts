import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_notification_templates_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IShoppingMallAdministrator.IJoin =
    typia.random<IShoppingMallAdministrator.IJoin>();
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare multiple notification templates (assuming templates exist or could be created externally)
  // We will perform pagination over multiple pages
  // 3. Query first page with limit 3
  const page1 =
    await api.functional.shoppingMall.administrator.notificationTemplates.index(
      adminConnection,
      {
        body: { limit: 3 } satisfies IShoppingMallNotificationTemplate.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "first page data length <= limit",
    page1.data.length <= 3,
  );
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 3", page1.pagination.limit, 3);
  if (page1.pagination.pages > 1) {
    // 4. Query second page with current 2
    const page2Request: IShoppingMallNotificationTemplate.IRequest = {
      limit: 3,
      current: 2,
    };
    const page2 =
      await api.functional.shoppingMall.administrator.notificationTemplates.index(
        adminConnection,
        {
          body: page2Request,
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "second page current is 2",
      page2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page data length <= limit",
      page2.data.length <= 3,
    );
    // 5. Test requesting beyond last page returns empty
    const beyondLastPageRequest: IShoppingMallNotificationTemplate.IRequest = {
      limit: 3,
      current: page1.pagination.pages + 10,
    };
    const beyondLastPage =
      await api.functional.shoppingMall.administrator.notificationTemplates.index(
        adminConnection,
        {
          body: beyondLastPageRequest,
        },
      );
    typia.assert(beyondLastPage);
    TestValidator.equals(
      "beyond last page data empty",
      beyondLastPage.data.length,
      0,
    );
  }
  // 6. Test unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access denied", 401, async () => {
    await api.functional.shoppingMall.administrator.notificationTemplates.index(
      unauthorizedConnection,
      {
        body: {},
      },
    );
  });
}
