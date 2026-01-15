import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardAuditEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditEvent";
export async function test_api_audit_event_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a valid eventId using a UUID format
  const eventId: string = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve the audit event by its eventId
  const auditEvent: IDiscussionBoardAuditEvent =
    await api.functional.discussionBoard.audit.events.at(connection, {
      eventId,
    });
  // Validate that the response type matches the IDiscussionBoardAuditEvent schema
  typia.assert(auditEvent);
}
