import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_deleted_user(
  connection: api.IConnection,
): Promise<void> {
  const userId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for deleted user",
    404,
    async () => {
      await api.functional.economicPoliticalDiscussionBoard.users.getById(
        connection,
        {
          id: userId,
        },
      );
    },
  );
}
