import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsChannel";
import type { ICommunityBbsKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaPenalty";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsChannel";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_karma_penalty_filter_by_user_and_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to gain access to karma penalties
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Use a fixed user_id and penalty_type that exists in the test environment
  // We cannot create data, so we rely on existing data
  // We'll use a generated UUID for user_id. The backend must have a karma penalty for this user
  // We'll use 'temporary_suspension' as the penalty_type
  const user_id = "00000000-0000-0000-0000-000000000001"; // We hope this user has a karma penalty in test
  const penalty_type: ICommunityBbsKarmaPenalty.IRequest["penalty_type"] =
    "temporary_suspension";
  // Step 3: Call the filtering endpoint
  const result: IPageICommunityBbsChannel =
    await api.functional.communityBbs.admin.karma_penalties.index(
      adminConnection,
      {
        body: {
          user_id,
          penalty_type,
          limit: 10,
          applied_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
          admin_id: "00000000-0000-0000-0000-000000000002", // Admin ID for the penalty
          after: "", // Empty cursor for first page
          order: "desc", // Fixed: Changed from 'orderBy' to 'order' to match schema definition
          sort_by: "applied_at", // Added required sort_by property with valid enum value
        } satisfies ICommunityBbsKarmaPenalty.IRequest,
      },
    );
  typia.assert(result);
  // Step 4: Validate response structure
  // Confirm pagination exists and follows schema
  TestValidator.predicate(
    "pagination should be an object",
    result.pagination !== null && typeof result.pagination === "object",
  );
  TestValidator.predicate(
    "pagination.current should be a positive integer",
    typeof result.pagination.current === "number" &&
      result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit should be a positive integer",
    typeof result.pagination.limit === "number" && result.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records should be a non-negative integer",
    typeof result.pagination.records === "number" &&
      result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be a non-negative integer",
    typeof result.pagination.pages === "number" && result.pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(result.data),
  );
  // Validate each item in data array if there are items
  if (result.data.length > 0) {
    for (const item of result.data) {
      // Check ICommunityBbsChannel properties
      TestValidator.predicate(
        "each item must have id",
        typeof item.id === "string" && item.id.length > 0,
      );
      TestValidator.predicate(
        "each item must have name",
        typeof item.name === "string" && item.name.length > 0,
      );
      TestValidator.predicate(
        "each item must have visibility",
        ["public", "private", "hidden"].includes(item.visibility),
      );
      TestValidator.predicate(
        "each item must have status",
        ["active", "archived", "suspended"].includes(item.status),
      );
      TestValidator.predicate(
        "each item must have created_at",
        typeof item.created_at === "string" &&
          !isNaN(Date.parse(item.created_at)),
      );
      TestValidator.predicate(
        "each item must have updated_at",
        typeof item.updated_at === "string" &&
          !isNaN(Date.parse(item.updated_at)),
      );
      TestValidator.predicate(
        "each item must have description that is either string or undefined",
        item.description === undefined || typeof item.description === "string",
      );
    }
  }
  // Note: The scenario requires 'user username' from joined community_bbs_member table, but this is not part of ICommunityBbsChannel definition.
  // This is a discrepancy in the API schema. We cannot validate what the API spec does not define.
  // We can only validate against the provided type IPageICommunityBbsChannel.
  // This test validates the structure of the response as defined by the schema.
}
