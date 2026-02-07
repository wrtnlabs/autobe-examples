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

export async function test_api_user_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Request page=2 with limit=10
  const response = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      },
    },
  );
  typia.assert(response);
  // Verify exactly 10 users are returned
  TestValidator.equals(
    "should return exactly 10 users",
    response.data.length,
    10,
  );
}
