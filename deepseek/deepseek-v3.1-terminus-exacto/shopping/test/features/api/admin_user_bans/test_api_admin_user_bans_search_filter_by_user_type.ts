import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_admin_user_bans_search_filter_by_user_type(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test search functionality with pagination
  const searchParams: IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest =
    {
      page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    };
  const response =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: searchParams,
      },
    );
  // Validate response structure
  typia.assert(response);
  // Test pagination metadata
  TestValidator.equals(
    "pagination exists",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", response.pagination.pages >= 0);
  // Test pagination calculation consistency
  if (response.pagination.limit > 0) {
    const calculatedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation matches records",
      response.pagination.pages,
      calculatedPages,
    );
  }
  // Test data array structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  TestValidator.predicate(
    "data length matches pagination limit",
    response.data.length <= response.pagination.limit,
  );
  // Validate individual ban records if present
  if (response.data.length > 0) {
    for (const banRecord of response.data) {
      // Validate required fields
      TestValidator.equals("ban record has id", typeof banRecord.id, "string");
      TestValidator.equals(
        "ban record has user_type",
        typeof banRecord.user_type,
        "string",
      );
      TestValidator.equals(
        "ban record has ban_reason",
        typeof banRecord.ban_reason,
        "string",
      );
      TestValidator.equals(
        "ban record has banned_at",
        typeof banRecord.banned_at,
        "string",
      );
      TestValidator.equals(
        "ban record has appeal_status",
        typeof banRecord.appeal_status,
        "string",
      );
      // Validate user_type is one of expected values
      const validUserTypes = ["customer", "seller", "administrator"];
      TestValidator.predicate(
        "user_type is valid",
        validUserTypes.includes(banRecord.user_type),
      );
      // Test optional fields
      TestValidator.predicate(
        "ban_duration_days is number or null",
        banRecord.ban_duration_days === null ||
          typeof banRecord.ban_duration_days === "number",
      );
      TestValidator.predicate(
        "lifted_at is string or null",
        banRecord.lifted_at === null || typeof banRecord.lifted_at === "string",
      );
      // Validate timestamp format
      TestValidator.predicate(
        "banned_at is valid date",
        !isNaN(new Date(banRecord.banned_at).getTime()),
      );
      if (banRecord.lifted_at && banRecord.lifted_at !== null) {
        TestValidator.predicate(
          "lifted_at is valid date",
          !isNaN(new Date(banRecord.lifted_at).getTime()),
        );
      }
    }
  }
  // Test empty search scenario
  const emptySearchParams: IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest =
    {
      page: 1,
      limit: 10,
    };
  const emptyResponse =
    await api.functional.ecommerce.administrator.admin_user_bans.index(
      adminConnection,
      {
        body: emptySearchParams,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty response data is array",
    Array.isArray(emptyResponse.data),
    true,
  );
}
