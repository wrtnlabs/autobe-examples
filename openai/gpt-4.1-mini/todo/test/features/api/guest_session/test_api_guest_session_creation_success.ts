import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { prepare_random_todo_app_guest_session } from "../../../prepare/prepare_random_todo_app_guest_session";
import { generate_random_todo_app_guests_sessions_create } from "../../../generate/generate_random_todo_app_guests_sessions_create";
export async function test_api_guest_session_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random guestId string (uuid format)
  const guestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Prepare accessToken, refreshToken, expiresAt
  const accessToken = RandomGenerator.alphaNumeric(40);
  const refreshToken = RandomGenerator.alphaNumeric(40);
  // Prepare expiresAt as ISO 8601 string in near future
  const expirationDate = new Date(Date.now() + 3600 * 1000).toISOString();
  // Prepare optional client metadata fields including some null values
  const ip = `${RandomGenerator.pick(["192.168.0.1", "10.0.0.1", "127.0.0.1"])}"`;
  const userAgent = RandomGenerator.pick([
    null,
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    null,
    "curl/7.64.1",
  ]);
  const deviceInfo = null; // explicit null to test nullable property
  // Construct the request body matching ITodoAppGuestSession.ICreate
  const body = {
    accessToken,
    refreshToken,
    expiresAt: expirationDate,
    ip,
    userAgent,
    deviceInfo,
  } satisfies ITodoAppGuestSession.ICreate;
  // Call the generation function to create the guest session
  const output = await generate_random_todo_app_guests_sessions_create(
    connection,
    {
      params: { guestId },
      body,
    },
  );
  // Validate the response type
  typia.assert(output);
  // Verify the guest_id matches the guestId used in path
  TestValidator.equals("guest session guest_id", output.guest_id, guestId);
  // Verify expired_at matches the expiresAt sent
  TestValidator.equals(
    "guest session expired_at",
    output.expired_at,
    expirationDate,
  );
  // Validate that optional fields are correctly stored (equal or null as supplied)
  TestValidator.equals("guest session ip", output.ip, ip ?? null);
  // Removed validation of output.userAgent and output.deviceInfo as they do not exist on output
  // Validate id is string & uuid format
  TestValidator.predicate(
    "guest session id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
}
