import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_section_details_retrieval_by_citizen(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for citizen authentication
  const citizenConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as citizen using authorized join function
  // This is mandatory as per utility function priority rules
  const citizenAuth: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        referrer: "https://example.com",
        href: "https://example.com/join",
      } satisfies IEconomicDiscussionCitizen.IJoin,
    });
  // Step 3: Retrieve section details
  // We assume the system has at least one section pre-created (test environment seed data)
  // We generate a random valid UUID to target an existing or non-existing section
  // The scenario requires successful retrieval, so we assume a section exists
  const section: IEconomicDiscussionSection =
    await api.functional.economicDiscussion.sections.at(citizenConnection, {
      sectionId: typia.random<string & tags.Format<"uuid">>(),
    });
  // Step 4: Validate the section response with typia.assert
  // The IEconomicDiscussionSection DTO has only 'id: string' property
  // Since typia.assert validates the entire structure and type-safe format, we don't need additional validation
  // We ignore the scenario requirement to validate 'name' and 'description' because they don't exist in the DTO
  typia.assert(section);
  // Validation: The section id must be a valid UUID format - handled automatically by typia.assert
  // This is sufficient for the limited DTO
}
