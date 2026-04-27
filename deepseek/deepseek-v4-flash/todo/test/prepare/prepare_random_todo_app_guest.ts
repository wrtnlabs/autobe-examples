import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random guest session initialization data for E2E testing.
 *
 * Generates a complete {@link ITodoAppGuest.ICreate} object with random
 * href and referrer values suitable for creating an anonymous guest
 * session.
 *
 * Both fields are user-provided strings stored as-is in the database.
 * The {@link href} represents the current page URL the guest was
 * browsing, and the {@link referrer} represents the HTTP referrer URL
 * that directed the guest to the application.
 *
 * Provide an optional input object to override specific properties
 * for test scenarios requiring specific URL patterns or empty string
 * values.
 *
 * @param input - Optional partial input to override default random values
 * @returns A complete ITodoAppGuest.ICreate object with all required properties
 */
export function prepare_random_todo_app_guest(
  input?: DeepPartial<ITodoAppGuest.ICreate> | undefined,
): ITodoAppGuest.ICreate {
  return {
    href: input?.href ?? RandomGenerator.paragraph({ sentences: 1 }),
    referrer: input?.referrer ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
