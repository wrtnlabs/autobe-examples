import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_economic_discussion_administrator_sections_create } from "../../../generate/generate_random_economic_discussion_administrator_sections_create";
import { prepare_random_economic_discussion_section } from "../../../prepare/prepare_random_economic_discussion_section";

export async function test_api_section_creation_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  typia.assert(admin);
  // Step 2: Verify authentication was successful
  TestValidator.notEquals("admin should have token", admin.token.access, "");
  // Step 3: Create section with empty ICreate object - this is the only valid option given the DTO definition
  const section =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {
        body: {} satisfies IEconomicDiscussionSection.ICreate,
      },
    );
  typia.assert(section);
  // Validate section has ID as per the IEconomicDiscussionSection type definition
  TestValidator.notEquals("section should have ID", section.id, "");
  // Note: Cannot validate name or description as they don't exist in IEconomicDiscussionSection.ICreate
}
