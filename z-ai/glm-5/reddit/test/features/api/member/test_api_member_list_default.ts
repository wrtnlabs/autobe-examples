import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_list_default(
  connection: api.IConnection,
): Promise<void> {
  // Call the endpoint with empty request body (no filters)
  const response = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination structure and default values
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Validate each member summary structure and security requirements
  for (const member of response.data) {
    typia.assert(member);
    // Verify password hash is NOT included (security check - business logic, not type validation)
    TestValidator.predicate(
      "password hash is not exposed",
      !("password_hash" in member) && !("password" in member),
    );
  }
  // Verify sorting: if multiple members, karma should be descending (default sort)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        "members sorted by karma descending",
        response.data[i - 1].karma >= response.data[i].karma,
      );
    }
  }
}
