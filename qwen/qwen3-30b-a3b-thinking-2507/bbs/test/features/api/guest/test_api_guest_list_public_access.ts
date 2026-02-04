import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticBoardGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_list_public_access(
  connection: api.IConnection,
): Promise<void> {
  const deviceFingerprint = typia.random<string & tags.Format<"uuid">>();
  const response: IPageIEconPoliticBoardGuest.ISummary =
    await api.functional.econPoliticBoard.guests.index(connection, {
      body: {
        page: 0,
        limit: 10,
        device_fingerprint: deviceFingerprint,
        sort_by: "created_at",
        order: "asc",
      } satisfies IEconPoliticBoardGuest.IRequest,
    });
  typia.assert(response);
  TestValidator.equals(
    "pagination current should be 1 (1-indexed)",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    response.pagination.limit,
    10,
  );
  TestValidator.notEquals(
    "pagination should have records",
    response.pagination.records,
    0,
  );
  for (const entry of response.data) {
    TestValidator.equals("entry should have id", Boolean(entry.id), true);
    TestValidator.equals(
      "entry should have device_fingerprint",
      Boolean(entry.device_fingerprint),
      true,
    );
    TestValidator.equals(
      "entry should have created_at",
      Boolean(entry.created_at),
      true,
    );
  }
}
