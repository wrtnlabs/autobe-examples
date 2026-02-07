import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const userId = typia.random<string & tags.Format<"uuid">>();
  const user = await api.functional.economyPoliticsBoard.users.at(connection, {
    userId,
  });
  typia.assert(user);
  TestValidator.equals("User ID matches input", user.id, userId);
  TestValidator.equals("Email is present", user.email, user.email);
  TestValidator.predicate(
    "Created at is valid ISO",
    user.created_at.includes("T"),
  );
  TestValidator.predicate(
    "Updated at is valid ISO",
    user.updated_at.includes("T"),
  );
  TestValidator.predicate(
    "Deleted at is valid or null",
    user.deleted_at === null ||
      user.deleted_at === undefined ||
      user.deleted_at.includes("T"),
  );
}
