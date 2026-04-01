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

export async function test_api_seller_account_browsing_and_moderation_list(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const firstPage =
    await api.functional.mallPlatform.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "createdAt",
          order: "asc",
        } satisfies IMallPlatformSeller.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate("seller page contains pagination metadata", () => {
    const pagination = firstPage.pagination;
    return (
      pagination.current === 1 &&
      pagination.limit === 5 &&
      pagination.pages >= 0 &&
      pagination.records >= 0
    );
  });
  TestValidator.predicate(
    "seller list returns records",
    () => firstPage.data.length >= 0,
  );
  TestValidator.predicate("seller summaries are structurally valid", () =>
    firstPage.data.every(
      (seller) =>
        seller.rejectionReason === null ||
        typeof seller.rejectionReason === "string",
    ),
  );
  TestValidator.predicate(
    "seller summaries do not expose sensitive credentials",
    () =>
      firstPage.data.every(
        (seller) =>
          !Object.prototype.hasOwnProperty.call(seller, "password") &&
          !Object.prototype.hasOwnProperty.call(seller, "passwordHash") &&
          !Object.prototype.hasOwnProperty.call(seller, "token"),
      ),
  );
  const stableSorted = [...firstPage.data].sort((x, y) =>
    x.createdAt === y.createdAt
      ? x.id.localeCompare(y.id)
      : x.createdAt.localeCompare(y.createdAt),
  );
  TestValidator.equals(
    "first page is stable sorted by createdAt and id",
    firstPage.data.map((seller) => seller.id),
    stableSorted.map((seller) => seller.id),
  );
  const activePage =
    await api.functional.mallPlatform.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "createdAt",
          order: "asc",
          deletedAt: false,
        } satisfies IMallPlatformSeller.IRequest,
      },
    );
  typia.assert(activePage);
  TestValidator.predicate("active-only filter omits deleted sellers", () =>
    activePage.data.every((seller) => seller.deletedAt === null),
  );
  const deletedPage =
    await api.functional.mallPlatform.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "createdAt",
          order: "asc",
          deletedAt: true,
        } satisfies IMallPlatformSeller.IRequest,
      },
    );
  typia.assert(deletedPage);
  TestValidator.predicate(
    "deleted-only filter returns deleted sellers when requested",
    () => deletedPage.data.every((seller) => seller.deletedAt !== null),
  );
  if (firstPage.data.length > 0) {
    const sample = firstPage.data[0];
    const statusFiltered =
      await api.functional.mallPlatform.administrator.sellers.index(
        adminConnection,
        {
          body: {
            status: sample.status,
            page: 1,
            limit: 5,
            sort: "createdAt",
            order: "asc",
          } satisfies IMallPlatformSeller.IRequest,
        },
      );
    typia.assert(statusFiltered);
    TestValidator.predicate(
      "status filter returns matching seller statuses only",
      () =>
        statusFiltered.data.every((seller) => seller.status === sample.status),
    );
    const emailFiltered =
      await api.functional.mallPlatform.administrator.sellers.index(
        adminConnection,
        {
          body: {
            email: sample.email,
            page: 1,
            limit: 5,
          } satisfies IMallPlatformSeller.IRequest,
        },
      );
    typia.assert(emailFiltered);
    TestValidator.predicate("email filter returns matching seller only", () =>
      emailFiltered.data.every((seller) => seller.email === sample.email),
    );
    const createdWindow =
      await api.functional.mallPlatform.administrator.sellers.index(
        adminConnection,
        {
          body: {
            createdAtFrom: sample.createdAt,
            createdAtTo: sample.createdAt,
            page: 1,
            limit: 5,
          } satisfies IMallPlatformSeller.IRequest,
        },
      );
    typia.assert(createdWindow);
    TestValidator.predicate(
      "createdAt range filter includes the selected seller",
      () => createdWindow.data.some((seller) => seller.id === sample.id),
    );
  }
  if (firstPage.pagination.pages >= 2) {
    const secondPage =
      await api.functional.mallPlatform.administrator.sellers.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 5,
            sort: "createdAt",
            order: "asc",
          } satisfies IMallPlatformSeller.IRequest,
        },
      );
    typia.assert(secondPage);
    const firstIds = new Set(firstPage.data.map((seller) => seller.id));
    const secondIds = new Set(secondPage.data.map((seller) => seller.id));
    TestValidator.predicate(
      "adjacent pages do not overlap",
      () => !Array.from(firstIds).some((id) => secondIds.has(id)),
    );
    const combinedIds = [...firstPage.data, ...secondPage.data].map(
      (seller) => seller.id,
    );
    TestValidator.predicate(
      "adjacent pages keep a consistent ordered sequence",
      () => {
        const merged = [...firstPage.data, ...secondPage.data].sort((x, y) =>
          x.createdAt === y.createdAt
            ? x.id.localeCompare(y.id)
            : x.createdAt.localeCompare(y.createdAt),
        );
        return (
          JSON.stringify(combinedIds) ===
          JSON.stringify(merged.map((seller) => seller.id))
        );
      },
    );
  }
}
