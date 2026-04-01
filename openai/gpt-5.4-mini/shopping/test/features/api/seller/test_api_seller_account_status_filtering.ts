import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_account_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const base = await api.functional.mallPlatform.administrator.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IMallPlatformSeller.IRequest,
    },
  );
  typia.assert(base);
  TestValidator.equals(
    "pagination page is first page",
    base.pagination.current,
    1,
  );
  const statuses = ["approved", "rejected", "suspended", "deleted"] as const;
  for (const status of statuses) {
    const page = await api.functional.mallPlatform.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          status,
        } satisfies IMallPlatformSeller.IRequest,
      },
    );
    typia.assert(page);
    TestValidator.predicate(`every seller matches status ${status}`, () =>
      page.data.every((seller) => seller.status === status),
    );
    if (status === "rejected") {
      TestValidator.predicate(
        "rejected sellers include rejection reasons",
        () => page.data.every((seller) => seller.rejectionReason !== null),
      );
    }
    if (status === "deleted") {
      TestValidator.predicate(
        "deleted sellers include deletedAt timestamp",
        () => page.data.every((seller) => seller.deletedAt !== null),
      );
    }
  }
  const searchTerm = RandomGenerator.alphabets(5);
  const searched =
    await api.functional.mallPlatform.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          search: searchTerm,
        } satisfies IMallPlatformSeller.IRequest,
      },
    );
  typia.assert(searched);
  TestValidator.predicate("search response contains seller summaries", () =>
    searched.data.every(
      (seller) => seller.email.length > 0 && seller.id.length > 0,
    ),
  );
  TestValidator.predicate("search results preserve summary fields", () =>
    searched.data.every(
      (seller) => seller.createdAt.length > 0 && seller.updatedAt.length > 0,
    ),
  );
}
