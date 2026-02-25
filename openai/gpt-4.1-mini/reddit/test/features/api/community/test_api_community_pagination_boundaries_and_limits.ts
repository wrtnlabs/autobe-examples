import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_community_pagination_boundaries_and_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  userConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Test limit boundary values
  // Minimum limit = 1
  {
    const body = { limit: 1 } satisfies ICommunityPlatformCommunity.IRequest;
    const output =
      await api.functional.communityPlatform.user.communities.index(
        userConnection,
        { body },
      );
    typia.assert(output);
    // Validate response structure
    TestValidator.predicate(
      "pagination.limit is 1",
      output.pagination.limit === 1,
    );
    TestValidator.predicate("data.length <= 1", output.data.length <= 1);
  }
  // Maximum limit = 100
  {
    const body = { limit: 100 } satisfies ICommunityPlatformCommunity.IRequest;
    const output =
      await api.functional.communityPlatform.user.communities.index(
        userConnection,
        { body },
      );
    typia.assert(output);
    TestValidator.predicate(
      "pagination.limit is 100",
      output.pagination.limit === 100,
    );
    TestValidator.predicate("data.length <= 100", output.data.length <= 100);
  }
  // 3. Test page boundary values
  // Retrieve first page with limit 5
  {
    const body = {
      page: 1,
      limit: 5,
    } satisfies ICommunityPlatformCommunity.IRequest;
    const output =
      await api.functional.communityPlatform.user.communities.index(
        userConnection,
        { body },
      );
    typia.assert(output);
    TestValidator.predicate(
      "pagination.current is 1",
      output.pagination.current === 1,
    );
    TestValidator.predicate("data.length <= 5", output.data.length <= 5);
  }
  // Retrieve page beyond last page
  // To determine last page, get pages count with limit 5
  {
    const body = { limit: 5 } satisfies ICommunityPlatformCommunity.IRequest;
    const baseOutput =
      await api.functional.communityPlatform.user.communities.index(
        userConnection,
        { body },
      );
    typia.assert(baseOutput);
    const totalPages = baseOutput.pagination.pages;
    if (totalPages > 0) {
      // Request page = totalPages + 1 (beyond last page)
      const bodyBeyond = {
        page: totalPages + 1,
        limit: 5,
      } satisfies ICommunityPlatformCommunity.IRequest;
      const out = await api.functional.communityPlatform.user.communities.index(
        userConnection,
        { body: bodyBeyond },
      );
      typia.assert(out);
      TestValidator.predicate(
        "pagination.current beyond last page",
        out.pagination.current === totalPages + 1,
      );
      TestValidator.equals("empty data beyond last page", out.data, []);
    }
  }
  // 4. Test invalid limit boundaries (less than 1, greater than 100) should be handled gracefully
  // Assuming API uses validation and defaults or errors
  // This test will try a limit of 0 and 101 expecting API to handle gracefully, possibly default to valid range or error
  {
    // limit = 0 (below min)
    const body = { limit: 0 } satisfies ICommunityPlatformCommunity.IRequest;
    await TestValidator.error(
      "limit below minimum should cause error or be handled",
      async () => {
        await api.functional.communityPlatform.user.communities.index(
          userConnection,
          { body },
        );
      },
    );
  }
  {
    // limit = 101 (above max)
    const body = { limit: 101 } satisfies ICommunityPlatformCommunity.IRequest;
    await TestValidator.error(
      "limit above maximum should cause error or be handled",
      async () => {
        await api.functional.communityPlatform.user.communities.index(
          userConnection,
          { body },
        );
      },
    );
  }
  // 5. Test default pagination (no page, no limit) returns valid result
  {
    const body = {} satisfies ICommunityPlatformCommunity.IRequest;
    const output =
      await api.functional.communityPlatform.user.communities.index(
        userConnection,
        { body },
      );
    typia.assert(output);
    TestValidator.predicate(
      "pagination.current is at least 1",
      output.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination.limit is between 1 and 100",
      output.pagination.limit >= 1 && output.pagination.limit <= 100,
    );
    TestValidator.predicate(
      "data length is within limit",
      output.data.length <= output.pagination.limit,
    );
  }
}
