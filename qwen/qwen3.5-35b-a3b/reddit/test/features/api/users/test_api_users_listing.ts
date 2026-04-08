import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_users_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the system with valid credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() satisfies string as string & tags.Format<"uri">,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Member calls the user listing endpoint with default pagination
  const listing = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(listing);
  // 3. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    listing.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", listing.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has total records",
    listing.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination calculates pages correctly",
    listing.pagination.pages ===
      Math.ceil(listing.pagination.records / listing.pagination.limit),
  );
  // 4. Verify data array structure
  TestValidator.equals("data is array", Array.isArray(listing.data), true);
  TestValidator.predicate(
    "data has at least one user record",
    listing.data.length >= 1,
  );
  // 5. Validate user summary records
  for (const user of listing.data) {
    typia.assert(user);
    // Verify user has required summary fields
    TestValidator.notEquals("user has id", user.id, undefined);
    TestValidator.notEquals("user has username", user.username, undefined);
    TestValidator.notEquals("user has karma", user.karma, undefined);
    TestValidator.notEquals("user has created_at", user.created_at, undefined);
    // Verify user summary does not include email (privacy)
    const userKeys = Object.keys(
      user,
    ) as (keyof IRedditPlatformMember.ISummary)[];
    TestValidator.equals(
      "email excluded from summary",
      (userKeys as string[]).includes("email"),
      false,
    );
    // Verify id is valid UUID format
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user.id,
      ),
    );
    // Verify created_at is valid ISO datetime
    TestValidator.predicate(
      "created_at is valid datetime",
      !isNaN(Date.parse(user.created_at)),
    );
    // Verify karma is an integer
    TestValidator.predicate("karma is integer", Number.isInteger(user.karma));
  }
  // 6. Verify default sorting is by created_at descending
  if (listing.data.length > 1) {
    const sortedByCreated = listing.data.every((user, index) => {
      if (index === 0) return true;
      return (
        new Date(user.created_at) <=
        new Date(listing.data[index - 1].created_at)
      );
    });
    TestValidator.predicate(
      "data sorted by created_at descending",
      sortedByCreated,
    );
  }
}