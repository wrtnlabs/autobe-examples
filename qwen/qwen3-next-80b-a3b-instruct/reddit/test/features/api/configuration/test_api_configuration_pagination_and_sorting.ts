import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Validate pagination with different page and limit values
  // Use existing configurations in the system (assumed to exist via other means)
  const limits = [2, 3, 5, 10]; // Test different limit values
  const pages = [1, 2, 3]; // Test different page values
  for (const limit of limits) {
    for (const page of pages) {
      const request: ICommunityPlatformConfiguration.IRequest = {
        page,
        limit,
      } satisfies ICommunityPlatformConfiguration.IRequest;
      const response: IPageICommunityPlatformConfiguration =
        await api.functional.communityPlatform.admin.configurations.index(
          adminConnection,
          {
            body: request,
          },
        );
      typia.assert(response);
      // Validate pagination metadata
      TestValidator.equals(
        "page matches request",
        response.pagination.current,
        page,
      );
      TestValidator.equals(
        "limit matches request",
        response.pagination.limit,
        limit,
      );
      TestValidator.predicate(
        "total records >= 0",
        () => response.pagination.records >= 0,
      );
      TestValidator.predicate(
        "total pages >= 1",
        () => response.pagination.pages >= 1,
      );
      // Validate data count
      TestValidator.predicate(
        "data length <= limit",
        () => response.data.length <= limit,
      );
      // For the last page, validate no data overflow
      if (page !== 1 && response.pagination.records > 0) {
        const totalPages = Math.ceil(response.pagination.records / limit);
        if (page === totalPages) {
          TestValidator.predicate(
            "last page data length <= records % limit",
            () =>
              response.data.length <=
              (response.pagination.records % limit || limit),
          );
        }
      }
    }
  }
  // Step 3: Validate sorting by only valid fields (key and category)
  // Note: last_modified_date is NOT a valid property in ICommunityPlatformConfiguration, so it's removed from test
  const sortKeys = ["key", "category"];
  const orders = ["asc", "desc"];
  for (const sort_by of sortKeys) {
    for (const order of orders) {
      const request: ICommunityPlatformConfiguration.IRequest = {
        page: 1,
        limit: 50, // Use a large limit to get most records for sorting validation
        sort_by: typia.assert<"key" | "last_modified_date" | "category" | undefined>(sort_by),
        order: typia.assert<"asc" | "desc" | undefined>(order),
      } satisfies ICommunityPlatformConfiguration.IRequest;
      const response: IPageICommunityPlatformConfiguration =
        await api.functional.communityPlatform.admin.configurations.index(
          adminConnection,
          {
            body: request,
          },
        );
      typia.assert(response);
      // Validate sorting
      if (sort_by === "key") {
        const keys = response.data.map((config) => config.key);
        if (order === "asc") {
          TestValidator.predicate("keys sorted ascending", () => {
            for (let i = 1; i < keys.length; i++) {
              if (keys[i] < keys[i - 1]) return false;
            }
            return true;
          });
        } else {
          // desc
          TestValidator.predicate("keys sorted descending", () => {
            for (let i = 1; i < keys.length; i++) {
              if (keys[i] > keys[i - 1]) return false;
            }
            return true;
          });
        }
      } else if (sort_by === "category") {
        const categories = response.data.map((config) => config.category);
        if (order === "asc") {
          TestValidator.predicate("categories sorted ascending", () => {
            for (let i = 1; i < categories.length; i++) {
              if (categories[i] < categories[i - 1]) return false;
            }
            return true;
          });
        } else {
          // desc
          TestValidator.predicate("categories sorted descending", () => {
            for (let i = 1; i < categories.length; i++) {
              if (categories[i] > categories[i - 1]) return false;
            }
            return true;
          });
        }
      }
    }
  }
}