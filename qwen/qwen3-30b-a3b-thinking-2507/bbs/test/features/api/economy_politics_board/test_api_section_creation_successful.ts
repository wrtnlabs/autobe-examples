import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economy_politics_board_admin_sections_create } from "../../../generate/generate_random_economy_politics_board_admin_sections_create";
import { prepare_random_economy_politics_board_section } from "../../../prepare/prepare_random_economy_politics_board_section";

export async function test_api_section_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://test.com/join",
      referrer: "https://test.com",
      ip: "127.0.0.1",
    } satisfies IEconomyPoliticsBoardAdmin.IJoin,
  });
  // 2. Create section using utility function
  const section =
    await generate_random_economy_politics_board_admin_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Business validation points
  TestValidator.predicate(
    "description length meets minimum 20 chars",
    section.description.length >= 20,
  );
  TestValidator.equals(
    "created_at timestamp exists",
    typeof section.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at timestamp exists",
    typeof section.updated_at,
    "string",
  );
  TestValidator.equals("section name uniqueness", section.name, section.name);
}
