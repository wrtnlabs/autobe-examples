import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_activity_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const guestId = typia.random<string & tags.Format<"uuid">>();
  const guest: IEconPoliticBoardGuest =
    await api.functional.econPoliticBoard.guests.at(connection, { guestId });
  typia.assert(guest);
}
