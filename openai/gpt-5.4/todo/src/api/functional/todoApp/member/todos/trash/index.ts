import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia from "typia";

import { IPageITodoAppTodo } from "../../../../../structures/IPageITodoAppTodo";
import { ITodoAppTodo } from "../../../../../structures/ITodoAppTodo";

/**
 * Retrieve a filtered and paginated list of the authenticated member's todo items that are currently in trash.
 *
 * This operation is the dedicated browsing entry point for deleted todos within the private todo workspace. It returns only todo records that belong to the requesting member and that have already been moved out of the active list into trash. In the underlying todo_app_todos table, this trash membership is represented by the deleted_at column being populated, while the todo remains the same business item with its original title, optional description, optional start_date, optional due_date, completion flag, and lifecycle timestamps preserved until permanent removal. The response is intended for trash list screens and similar list-oriented user interfaces, so it should provide summary-oriented todo information together with pagination metadata.
 *
 * Access to this operation is restricted to the authenticated member actor. The todo_app_todos model is explicitly private to its owner through the todo_app_member_id foreign key, and the service must always derive that ownership scope from the authenticated session instead of accepting ownership criteria from client input. This privacy boundary is mandatory for both non-empty and empty pages. Even when the requested page is beyond the available result set, the response must still reflect only the requesting member's own deleted todos and must never reveal or infer data from another member's workspace.
 *
 * The operation supports trash browsing behavior described in the requirements for deleted-state handling. Deleted todos must not appear in the normal todo list, and this endpoint must do the inverse by returning only deleted todos. Filtering and sorting are applied after the mandatory ownership and deleted-state constraints have been enforced. When sorting by start date or due date, records with null start_date or null due_date must be placed at the end of the ordered results. If completion-status filtering is supported through the request DTO, it applies only within the member's deleted todos rather than mixing active and deleted records.
 *
 * This endpoint is commonly used together with other todo lifecycle operations. A member would typically browse the active list through the normal todo index, move a todo into trash through the delete operation, then use this trash index to find items eligible for restoration or permanent removal. After a successful restore operation, the restored todo should no longer be returned by this endpoint because it is no longer in the deleted state. After a successful permanent removal operation, the todo and its related edit history are no longer available and therefore cannot appear in subsequent trash results.
 *
 * If the member requests a page beyond the available trash results, the service must return an empty data set for that page instead of raising an error solely because the page is empty. Error handling should focus on authentication and access context, malformed request-body search or sort input, and internal lookup or query failures. The endpoint should treat deleted-state membership as a strict inclusion rule for this list and must not return active todos under any filter or sort combination.
 *
 * @param props.connection
 * @param props.body Trash list search, filter, sort, and pagination options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a member-scoped trash browsing query over todo_app_todos.
 *
 * Authenticate the caller as a member and obtain the member identifier from the authenticated session context. Build the base query with a mandatory WHERE clause requiring todo_app_member_id to equal the authenticated member ID and deleted_at to be non-null. Do not allow the client request body to override either ownership scope or trash-state scope.
 *
 * Accept an ITodoAppTodo.IRequest body for pagination, filtering, and sorting input. Apply supported filters only within the already constrained deleted todo dataset. If completion-status filtering is provided, map it to the completed column. If text search is supported by the DTO, restrict it to fields that actually exist in todo_app_todos, such as title and optionally description, using implementation-appropriate matching. Do not reference non-existent status columns or imagined ownership fields.
 *
 * Implement sorting using the real schema columns. Support creation-date ordering via created_at. Support start-date ordering via start_date and due-date ordering via due_date. For start_date and due_date sorts, ensure null values are ordered last regardless of ascending or descending direction, matching the browsing requirements for undated todos. Apply a deterministic secondary sort such as updated_at DESC or id ASC as needed to avoid unstable pagination when primary sort values are duplicated.
 *
 * Return paginated summary results as IPageITodoAppTodo.ISummary. The summary projection should be sufficient for trash list presentation and should include fields aligned with the requirements for list browsing, such as title, completed, created_at, start_date, due_date, and deleted_at when the DTO definition supports it. Avoid returning unrelated child history data from this list operation.
 *
 * If the requested page is beyond the available rows, return an empty page result rather than an error. Preserve the member scope for empty-page responses exactly as for populated responses. Validate request-body values according to DTO rules and reject malformed sort/filter combinations. Keep this operation read-only: it must not restore, permanently remove, or otherwise mutate any todo row. Those state transitions belong to separate operations.
 * @path /todoApp/member/todos/trash
 * @accessor api.functional.todoApp.member.todos.trash.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Trash list search, filter, sort, and pagination options
     */
    body: ITodoAppTodo.IRequest;
  };
  export type Body = ITodoAppTodo.IRequest;
  export type Response = IPageITodoAppTodo.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/todoApp/member/todos/trash",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/todoApp/member/todos/trash";
  export const random = (): IPageITodoAppTodo.ISummary =>
    typia.random<IPageITodoAppTodo.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
