import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { prepare_random_todo_app_guest_session } from "../prepare/prepare_random_todo_app_guest_session";
export async function generate_random_todo_app_guests_sessions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppGuestSession.ICreate> | undefined;
    params: {
      guestId: string;
    };
  },
): Promise<ITodoAppGuestSession> {
  const prepared: ITodoAppGuestSession.ICreate =
    prepare_random_todo_app_guest_session(props.body);
  const result: ITodoAppGuestSession =
    await api.functional.todoApp.guests.sessions.create(connection, {
      guestId: props.params.guestId,
      body: prepared,
    });
  return result;
}
