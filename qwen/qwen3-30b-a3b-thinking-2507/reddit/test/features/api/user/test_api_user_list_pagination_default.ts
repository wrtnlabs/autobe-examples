import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_list_pagination_default(
  connection: api.IConnection,
): Promise<void> {
  const output = await api.functional.communityPlatform.users.index(
    connection,
    {
      body: {
        sort: "newest",
        filter: "active",
        limit: 20,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(output);
  const paginationMetadata = output.pagination;
  const users = output.data;
  // Verify pagination metadata
  TestValidator.equals("pagination current", paginationMetadata.current, 1);
  TestValidator.equals("pagination limit", paginationMetadata.limit, 20);
  TestValidator.predicate(
    "pagination records > 0",
    paginationMetadata.records > 0,
  );
  TestValidator.predicate("pagination pages > 0", paginationMetadata.pages > 0);
  // Verify data exists
  TestValidator.predicate("user data present", users.length > 0);
  // Verify first user's profile data
  const firstUser = users[0];
  TestValidator.predicate(
    "valid display name length",
    firstUser.display_name.length >= 2 && firstUser.display_name.length <= 50,
  );
  TestValidator.predicate(
    "valid profile picture URL",
    firstUser.profile_picture_url.startsWith("http"),
  );
  TestValidator.predicate(
    "non-negative karma score",
    firstUser.karma_score >= 0,
  );
}
