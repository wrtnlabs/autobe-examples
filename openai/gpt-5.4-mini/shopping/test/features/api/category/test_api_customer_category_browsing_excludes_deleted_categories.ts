import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_category_browsing_excludes_deleted_categories(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request = {
    page: 1,
    limit: 100,
    sort: "newest",
  } satisfies IMallPlatformCategory.IRequest;
  const first = await api.functional.mallPlatform.customer.categories.index(
    customerConnection,
    { body: request },
  );
  typia.assert(first);
  const second = await api.functional.mallPlatform.customer.categories.index(
    customerConnection,
    { body: request },
  );
  typia.assert(second);
  TestValidator.equals("category browsing should be read-only", first, second);
  TestValidator.predicate(
    "returned categories should all be visible to customers",
    first.data.every((category) => category.deletedAt === null),
  );
  TestValidator.predicate(
    "returned root categories should not expose deleted parents",
    first.data.every(
      (category) =>
        category.parentCategory === null ||
        category.parentCategory.deletedAt === null,
    ),
  );
}
