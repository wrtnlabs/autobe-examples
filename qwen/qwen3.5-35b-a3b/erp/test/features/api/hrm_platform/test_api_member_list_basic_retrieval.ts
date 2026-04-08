import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_list_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for API calls
  const actorConnection: api.IConnection = { host: connection.host };
  // Call the member list endpoint with default pagination parameters
  const response = await api.functional.hrmPlatform.members.index(
    actorConnection,
    {
      body: {} satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination present",
    response.pagination,
    response.pagination,
  );
  TestValidator.predicate(
    "pagination has current field",
    response.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit field",
    response.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records field",
    response.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages field",
    response.pagination.pages !== undefined,
  );
  // Validate default limit is 20
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  // Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Validate each member summary structure
  for (const member of response.data) {
    typia.assert(member);
    // Validate required fields are present
    TestValidator.predicate("member has id field", member.id !== undefined);
    TestValidator.predicate(
      "member has email field",
      member.email !== undefined,
    );
    TestValidator.predicate(
      "member has is_active field",
      member.is_active !== undefined,
    );
    TestValidator.predicate(
      "member has created_at field",
      member.created_at !== undefined,
    );
    TestValidator.predicate(
      "member has updated_at field",
      member.updated_at !== undefined,
    );
    // Validate optional display fields
    TestValidator.predicate(
      "display_name can be undefined",
      member.display_name === undefined ||
        typeof member.display_name === "string",
    );
    TestValidator.predicate(
      "avatar_uri can be undefined",
      member.avatar_uri === undefined || typeof member.avatar_uri === "string",
    );
    TestValidator.predicate(
      "phone_number can be undefined",
      member.phone_number === undefined ||
        typeof member.phone_number === "string",
    );
    // Validate last_login_at can be null
    TestValidator.predicate(
      "last_login_at can be null",
      member.last_login_at === null ||
        member.last_login_at === undefined ||
        typeof member.last_login_at === "string",
    );
    // Validate deleted_at can be null
    TestValidator.predicate(
      "deleted_at can be null",
      member.deleted_at === null ||
        member.deleted_at === undefined ||
        (typeof member.deleted_at === "string" &&
          !member.deleted_at.includes("invalid")),
    );
    // Security: password_hash should NOT be in response
    TestValidator.predicate(
      "password_hash is not exposed",
      !("password_hash" in member),
    );
  }
  // Validate pagination metadata accuracy
  TestValidator.predicate(
    "records count matches actual data length",
    response.pagination.records >= response.data.length,
  );
  // Validate pages calculation
  const expectedPages = Math.max(
    1,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
}