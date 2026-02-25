import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_at_active_section(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for sectionId
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create actor-specific connection per Connection Isolation Pattern
  const actorConnection: api.IConnection = { host: connection.host };
  // Call the GET /economicBoard/sections/{sectionId} endpoint
  const response = await api.functional.economicBoard.sections.at(
    actorConnection,
    {
      sectionId: sectionId,
    },
  );
  // Validate response type
  typia.assert(response);
  // Validate all required fields from IEconomicBoardSection
  TestValidator.equals("section ID matches", response.id, sectionId);
  TestValidator.predicate(
    "section name is not empty",
    response.name.length > 0,
  );
  TestValidator.predicate(
    "section description is valid",
    typeof response.description === "string",
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      response.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      response.updated_at,
    ),
  );
  // Validate that deleted_at is null (active section)
  TestValidator.equals("section deleted_at is null", response.deleted_at, null);
}
