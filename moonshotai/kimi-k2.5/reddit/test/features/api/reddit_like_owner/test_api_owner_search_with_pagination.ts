import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeOwner";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first owner to authenticate
  const ownerConnection1: api.IConnection = { host: connection.host };
  const firstOwner = await authorize_owner_join(ownerConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  typia.assert(firstOwner);
  // 2. Create second owner for multiple records
  const ownerConnection2: api.IConnection = { host: connection.host };
  const secondOwner = await authorize_owner_join(ownerConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  typia.assert(secondOwner);
  // 3. Search for owners with partial username match (use first 3 chars of second owner's username)
  const searchTerm = secondOwner.username.substring(0, 3);
  const searchRequest: IRedditLikeOwner.IRequest = {
    search: searchTerm,
    sort: "created_at:desc",
    limit: 10,
    page: 1,
  } satisfies IRedditLikeOwner.IRequest;
  // 4. Make PATCH request to search owners
  const response: IPageIRedditLikeOwner.ISummary =
    await api.functional.redditLike.owners.index(ownerConnection1, {
      body: searchRequest,
    });
  typia.assert(response);
  // 5. Validate pagination metadata
  const pagination: IPage.IPagination = response.pagination;
  typia.assert(pagination);
  TestValidator.equals("pagination current page", pagination.current, 1);
  TestValidator.equals("pagination limit", pagination.limit, 10);
  TestValidator.predicate("pagination records >= 1", pagination.records >= 1);
  TestValidator.predicate("pagination pages >= 1", pagination.pages >= 1);
  // 6. Validate owner data structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  for (const owner of response.data) {
    typia.assert<IRedditLikeOwner.ISummary>(owner);
    TestValidator.predicate("owner has id", typeof owner.id === "string");
    TestValidator.predicate(
      "owner has username",
      typeof owner.username === "string",
    );
    TestValidator.predicate(
      "owner has displayName",
      typeof owner.displayName === "string",
    );
    TestValidator.predicate("owner has email", typeof owner.email === "string");
    TestValidator.predicate(
      "owner has isActive",
      typeof owner.isActive === "boolean",
    );
  }
  // 7. Verify the searched owner is in results
  const foundOwner = response.data.find((owner) => owner.id === secondOwner.id);
  TestValidator.predicate(
    "searched owner found in results",
    foundOwner !== undefined,
  );
  // 8. Test another search with isActive filter
  const activeSearchRequest: IRedditLikeOwner.IRequest = {
    isActive: true,
    sort: "created_at:desc",
    limit: 5,
    page: 1,
  } satisfies IRedditLikeOwner.IRequest;
  const activeResponse: IPageIRedditLikeOwner.ISummary =
    await api.functional.redditLike.owners.index(ownerConnection1, {
      body: activeSearchRequest,
    });
  typia.assert(activeResponse);
  // Validate all returned owners are active
  for (const owner of activeResponse.data) {
    TestValidator.equals("owner is active", owner.isActive, true);
  }
}
