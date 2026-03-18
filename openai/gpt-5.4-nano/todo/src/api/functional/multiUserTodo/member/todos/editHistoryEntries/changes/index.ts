import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IMultiUserTodoEditHistoryEntryChange } from "../../../../../../structures/IMultiUserTodoEditHistoryEntryChange";
import { IPageIMultiUserTodoEditHistoryEntryChange } from "../../../../../../structures/IPageIMultiUserTodoEditHistoryEntryChange";

/**
 * Creates field-level change records that belong to a specific edit history entry for the selected todo.
 *
 * This operation is designed to support the audit requirement that, whenever a user successfully edits one of their own todos, the system creates exactly one edit history entry and, additionally, records per-field before/after values only for the attributes that actually changed. The underlying database model stores each edited attribute change as a separate row in the edit-history-entry-changes table, keyed by the edit history entry id and the changed field name.
 *
 * Security and ownership: the operation must validate that the target todo belongs to the current authenticated member. Access to edit history is restricted to the user’s own todo scope, so requests that reference a todo that does not exist or is owned by another user must be rejected with a business-level error explanation.
 *
 * Data consistency and validation rules: the request must create change rows associated with the provided `editHistoryEntryId`. Each created change row represents one todo field that was actually modified by that edit action, and records the previous value (`fromValue`) and the new value (`toValue`). The service layer must ensure that it only persists meaningful changes—if the edit did not actually change a field, no change row should be created for that field.
 *
 * Relationship to edit history viewing: once these change rows are created, the viewing operation for a todo’s full edit history can display them grouped under the corresponding edit history entry, including the edit timestamp ordering (most recent to oldest) and the per-field before/after values for the fields that were modified.
 *
 * Error handling: if the request is invalid (e.g., inconsistent changed field names, missing required value pairs for a particular field change) or references a nonexistent edit history entry or todo, the system must reject the operation without leaving partial persisted updates. If an unexpected server-side failure occurs after any changes would have been applied, the implementation must roll back so the todo edit history remains in a prior consistent state.
 *
 * @param props.connection
 * @param props.todoId Target todo identifier whose edit history entry changes are being created. Ownership is validated against the current authenticated member.
 * @param props.editHistoryEntryId Target edit history entry identifier under the specified todo. Must belong to the same todo scope.
 * @param props.body Change records to create for the specified edit history entry. Each item represents one todo field that was actually changed by that edit, including the previous value (`fromValue`) and new value (`toValue`). Only changed fields should be included.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps for POST /todos/{todoId}/editHistoryEntries/{editHistoryEntryId}/changes:
 *
 * 1) Authentication/authorization
 * - Resolve the current authenticated member identity.
 * - Load the target todo by `todoId` and verify ownership by the current member.
 * - Load the edit history entry by `editHistoryEntryId` and verify it belongs to the target todo.
 *
 * 2) Validate request payload
 * - For each requested change item, validate that the `changedField` is one of the permitted todo editable attributes used by this audit model (title, description, start_date, due_date as represented by the API DTO).
 * - Ensure exactly one change row is created per (`editHistoryEntryId`, `changedField`). If the request contains duplicates, reject.
 * - Validate that the `fromValue` and `toValue` semantics are consistent with the change (e.g., if a field is newly set, `fromValue` should represent absence; if cleared, `toValue` should represent absence). The API DTO uses nullable strings for absent values.
 *
 * 3) Persist changes atomically
 * - Use a single database transaction.
 * - Insert into `multi_user_todo_edit_history_entry_changes` for each change item.
 * - The table enforces uniqueness on (`multi_user_todo_edit_history_entry_id`, `changed_field`), so rely on it in addition to request validation.
 *
 * 4) Response mapping
 * - Return the created change objects as defined by the relevant DTO response type, ensuring the response reflects exactly what was inserted.
 *
 * 5) Error handling
 * - Business rejections (todo not found, todo not owned, edit history entry not found for this todo, invalid state) should be returned as business-level errors with clear explanations.
 * - Any unexpected failure must roll back the transaction to prevent a partially created audit trail.
 *
 * Implementation must not attempt to compute or modify the edit history entry timestamp here; `edited_at` ordering and the single-entry-per-edit rule are handled by the edit history entry creation workflow, while this endpoint only creates the per-field change rows for the provided edit history entry.
 * @path /multiUserTodo/member/todos/:todoId/editHistoryEntries/:editHistoryEntryId/changes
 * @accessor api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.createChanges
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function createChanges(
  connection: IConnection,
  props: createChanges.Props,
): Promise<createChanges.Response> {
  return true === connection.simulate
    ? createChanges.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...createChanges.METADATA,
          path: createChanges.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace createChanges {
  export type Props = {
    /**
     * Target todo identifier whose edit history entry changes are being created. Ownership is validated against the current authenticated member.
     */
    todoId: string & tags.Format<"uuid">;

    /**
     * Target edit history entry identifier under the specified todo. Must belong to the same todo scope.
     */
    editHistoryEntryId: string & tags.Format<"uuid">;

    /**
     * Change records to create for the specified edit history entry. Each item represents one todo field that was actually changed by that edit, including the previous value (`fromValue`) and new value (`toValue`). Only changed fields should be included.
     */
    body: IMultiUserTodoEditHistoryEntryChange.ICreate;
  };
  export type Body = IMultiUserTodoEditHistoryEntryChange.ICreate;
  export type Response = IMultiUserTodoEditHistoryEntryChange;

  export const METADATA = {
    method: "POST",
    path: "/multiUserTodo/member/todos/:todoId/editHistoryEntries/:editHistoryEntryId/changes",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/multiUserTodo/member/todos/${encodeURIComponent(props.todoId ?? "null")}/editHistoryEntries/${encodeURIComponent(props.editHistoryEntryId ?? "null")}/changes`;
  export const random = (): IMultiUserTodoEditHistoryEntryChange =>
    typia.random<IMultiUserTodoEditHistoryEntryChange>();
  export const simulate = (
    connection: IConnection,
    props: createChanges.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: createChanges.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("todoId")(() => typia.assert(props.todoId));
      assert.param("editHistoryEntryId")(() =>
        typia.assert(props.editHistoryEntryId),
      );
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

/**
 * Retrieve the field-level change records that were captured as part of a specific todo edit history entry.
 *
 * This endpoint is scoped by both the target todo identifier and the target edit history entry identifier. The system uses these two parameters to ensure the returned change rows belong to the edit history entry that was created for the given todo.
 *
 * Security and ownership are enforced at request time: only the authenticated member who owns the specified todo can access the edit history changes. If the todo does not exist, or the user does not own it, or the edit history entry does not belong to the provided todo, the system must reject the request with a business-level explanation (no data leakage).
 *
 * Each returned change record represents exactly one todo attribute that was actually changed during that edit action. The payload includes the changed_field name and the before/after values as stored in the normalized change table. The record creation time (created_at) is used for ordering.
 *
 * Validation and error behavior are aligned with the general error scenarios: requests that target non-owned or non-existent resources are rejected, and requests that would be inconsistent with the provided identifiers are rejected. Unexpected server failures must not expose internal details; the response should remain a clear business-level error, and no partial outcome must be produced.
 *
 * Related operations: a client typically retrieves a todo’s edit history entries first (to obtain editHistoryEntryId), and then calls this endpoint to view the per-field changes associated with a selected entry. If the client only needs a list of todos, it should use the corresponding todo list operations instead of this endpoint.
 *
 * @param props.connection
 * @param props.todoId Target todo identifier whose edit history entry changes are being viewed. Ownership is enforced against the authenticated member.
 * @param props.editHistoryEntryId Target todo edit history entry identifier whose per-field changes are being listed.
 * @param props.body Pagination, sorting, and optional filtering criteria for listing the per-field changes of the specified edit history entry.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification List change rows for a given todo edit history entry.
 *
 * Implementation:
 * 1. Authenticate request as member; determine the owning member identity.
 * 2. Validate identifiers:
 *    - Look up the todo by todoId and ensure its owner matches the authenticated member.
 *    - Look up the edit history entry by editHistoryEntryId and ensure it belongs to the given todoId.
 *    - If not found or ownership mismatch, reject with business-level error.
 * 3. Apply search/pagination/sorting from request body (IRequest) to the changes rows.
 *    - Default ordering: changes created_at newest-first, consistent with edit history being presented newest-first.
 * 4. Query multi_user_todo_edit_history_entry_changes with filters:
 *    - multi_user_todo_edit_history_entry_id = editHistoryEntryId
 *    - Exclude logically deleted rows only if the application has such filtering rules; otherwise, return existing rows as stored.
 * 5. Return paginated results:
 *    - Use summary DTO fields appropriate for list display.
 * 6. Ensure read-only behavior: do not modify any records.
 *
 * Edge cases:
 * - If the edit history entry exists but has zero associated field changes, return an empty paginated list.
 * - If identifiers are inconsistent (edit history entry not belonging to todo), reject rather than returning partial data.
 * - On unexpected exceptions, return a generic business-level error and ensure no partial/side effects occur.
 * @path /multiUserTodo/member/todos/:todoId/editHistoryEntries/:editHistoryEntryId/changes
 * @accessor api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.index
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
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Target todo identifier whose edit history entry changes are being viewed. Ownership is enforced against the authenticated member.
     */
    todoId: string & tags.Format<"uuid">;

    /**
     * Target todo edit history entry identifier whose per-field changes are being listed.
     */
    editHistoryEntryId: string & tags.Format<"uuid">;

    /**
     * Pagination, sorting, and optional filtering criteria for listing the per-field changes of the specified edit history entry.
     */
    body: IMultiUserTodoEditHistoryEntryChange.IRequest;
  };
  export type Body = IMultiUserTodoEditHistoryEntryChange.IRequest;
  export type Response = IPageIMultiUserTodoEditHistoryEntryChange.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/multiUserTodo/member/todos/:todoId/editHistoryEntries/:editHistoryEntryId/changes",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/multiUserTodo/member/todos/${encodeURIComponent(props.todoId ?? "null")}/editHistoryEntries/${encodeURIComponent(props.editHistoryEntryId ?? "null")}/changes`;
  export const random =
    (): IPageIMultiUserTodoEditHistoryEntryChange.ISummary =>
      typia.random<IPageIMultiUserTodoEditHistoryEntryChange.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("todoId")(() => typia.assert(props.todoId));
      assert.param("editHistoryEntryId")(() =>
        typia.assert(props.editHistoryEntryId),
      );
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

/**
 * Retrieve a single edit-history field change for a specific todo.
 *
 * This endpoint is designed for audit-style inspection of how a given todo was modified over time. It targets exactly one record in the edit-history “changes” set, identified by the combination of the parent todo, the parent edit-history entry, and the specific change record. The returned data shows the field that changed and the before/after values recorded for that edit action.
 *
 * Authorization and privacy are enforced by scoping the query to the todo identified by `todoId`. The system must ensure the authenticated member can only access edit history that belongs to their own todos, and must reject requests that reference a todo (or edit-history entry) outside the member’s ownership scope.
 *
 * Behaviorally, this operation does not perform any mutation. It only reads the existing row representing the change record, and returns it in a structured form suitable for UI rendering of an audit diff.
 *
 * If the referenced todo does not exist or does not belong to the authenticated member, or if the specified edit-history entry / change record is not found under the given parents, the system rejects the request with a clear business-level explanation.
 *
 * Related operations that are typically used together include:
 * - retrieving the todo itself (to view context)
 * - retrieving an edit history entry (to view the overall edit event)
 * - retrieving the full set of changes for an edit history entry (for multi-field diffs)
 *
 * @param props.connection
 * @param props.todoId Target todo ID that scopes the audit history access to the authenticated member.
 * @param props.editHistoryEntryId Target edit history entry ID under the given todo.
 * @param props.changeId Target field-change record ID under the given edit history entry.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Extract path parameters: todoId, editHistoryEntryId, changeId.
 * 2) Authorization: resolve the authenticated member identity (per actor rules) and ensure the todo identified by todoId belongs to that member. If not found or not owned, reject with a business-level error.
 * 3) Data access (single transaction/read):
 *    - Query multi_user_todo_edit_history_entries by id = editHistoryEntryId and multi_user_todo_id = todoId.
 *    - If the edit history entry does not exist under that todo, reject.
 *    - Query multi_user_todo_edit_history_entry_changes by id = changeId and multi_user_todo_edit_history_entry_id = editHistoryEntryId.
 *    - If not found, reject.
 * 4) Return the change record mapped to the detailed DTO.
 * 5) Error handling:
 *    - For any unexpected server failure, respond with a generic business-level error and do not expose internal details.
 *    - Ensure the operation remains read-only and does not create history records.
 * @path /multiUserTodo/member/todos/:todoId/editHistoryEntries/:editHistoryEntryId/changes/:changeId
 * @accessor api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Target todo ID that scopes the audit history access to the authenticated member.
     */
    todoId: string & tags.Format<"uuid">;

    /**
     * Target edit history entry ID under the given todo.
     */
    editHistoryEntryId: string & tags.Format<"uuid">;

    /**
     * Target field-change record ID under the given edit history entry.
     */
    changeId: string & tags.Format<"uuid">;
  };
  export type Response = IMultiUserTodoEditHistoryEntryChange;

  export const METADATA = {
    method: "GET",
    path: "/multiUserTodo/member/todos/:todoId/editHistoryEntries/:editHistoryEntryId/changes/:changeId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/multiUserTodo/member/todos/${encodeURIComponent(props.todoId ?? "null")}/editHistoryEntries/${encodeURIComponent(props.editHistoryEntryId ?? "null")}/changes/${encodeURIComponent(props.changeId ?? "null")}`;
  export const random = (): IMultiUserTodoEditHistoryEntryChange =>
    typia.random<IMultiUserTodoEditHistoryEntryChange>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("todoId")(() => typia.assert(props.todoId));
      assert.param("editHistoryEntryId")(() =>
        typia.assert(props.editHistoryEntryId),
      );
      assert.param("changeId")(() => typia.assert(props.changeId));
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

/**
 * Updates a single per-field change record inside a todo’s edit history entry.
 *
 * This endpoint operates on the normalized audit structure described by the domain requirements: a *TodoEditHistoryEntry* represents one recorded edit moment for a specific todo, and each associated per-field change record stores the “before” and “after” values for exactly one editable attribute.
 *
 * The update is scoped by the full route context (todoId → editHistoryEntryId → changeId) so that the change record cannot be modified outside its owning todo and edit history entry. The operation must preserve audit integrity: history content must reflect what actually changed as part of the accepted edit, meaning the stored before/after pair must correspond to the specific edited attribute, and attributes that were not part of the edit must not be introduced by this update.
 *
 * @param props.connection
 * @param props.todoId Target todo ID that scopes the edit history entry and per-field change being updated (must belong to the authenticated member).
 * @param props.editHistoryEntryId Target todo edit history entry ID that scopes the per-field change being updated.
 * @param props.changeId Target per-field edit history change ID to update.
 * @param props.body Updated values for the specified per-field edit-history change record (representing exactly one editable attribute’s before/after values within the edit history entry). The payload must not change the attribute scope in a way that would violate the audit invariant that history records only fields that were actually changed by the edit.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps:
 *
 * 1) Resolve authentication context (current member identity).
 *
 * 2) Ownership and existence checks (in a single transaction or a consistent read strategy):
 *    - Load the todo by todoId.
 *    - Verify todo ownership by current member.
 *    - Load the edit history entry by editHistoryEntryId.
 *    - Verify the edit history entry belongs to the loaded todo.
 *    - Load the change record by changeId.
 *    - Verify the change belongs to the loaded edit history entry.
 *
 * 3) Validate update payload:
 *    - Ensure changed_field is a valid todo attribute key accepted by the domain (title, description, start_date, due_date), according to the business rules for editable fields.
 *    - Ensure from_value and to_value are consistent with changed_field semantics.
 *    - If the incoming values do not represent an actual difference, decide per business rule whether to allow the update while keeping audit integrity; reject invalid no-op payloads if required by domain constraints.
 *
 * 4) Apply update:
 *    - Update the change record atomically.
 *    - Update updated_at timestamps.
 *
 * 5) Error handling:
 *    - If any of the referenced records do not exist, or associations mismatch, reject with a clear business-level reason (requested resource not found / not owned / invalid association).
 *    - On unexpected server failure after any modifications, use transactional guarantees to avoid partial updates and keep the system in the prior consistent state.
 *
 * 6) Return:
 *    - Return the updated change record DTO.
 *
 * Database interaction guidance:
 * - Prefer primary key lookups for todo, edit history entry, and change.
 * - Enforce association checks by verifying foreign keys (todo_id and edit_history_entry_id relationships) before writing.
 * - Use a transaction boundary to prevent inconsistent cross-record updates.
 * @path /multiUserTodo/member/todos/:todoId/editHistoryEntries/:editHistoryEntryId/changes/:changeId
 * @accessor api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function updateTodoEditHistoryEntryChange(
  connection: IConnection,
  props: updateTodoEditHistoryEntryChange.Props,
): Promise<updateTodoEditHistoryEntryChange.Response> {
  return true === connection.simulate
    ? updateTodoEditHistoryEntryChange.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...updateTodoEditHistoryEntryChange.METADATA,
          path: updateTodoEditHistoryEntryChange.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace updateTodoEditHistoryEntryChange {
  export type Props = {
    /**
     * Target todo ID that scopes the edit history entry and per-field change being updated (must belong to the authenticated member).
     */
    todoId: string & tags.Format<"uuid">;

    /**
     * Target todo edit history entry ID that scopes the per-field change being updated.
     */
    editHistoryEntryId: string & tags.Format<"uuid">;

    /**
     * Target per-field edit history change ID to update.
     */
    changeId: string & tags.Format<"uuid">;

    /**
     * Updated values for the specified per-field edit-history change record (representing exactly one editable attribute’s before/after values within the edit history entry). The payload must not change the attribute scope in a way that would violate the audit invariant that history records only fields that were actually changed by the edit.
     */
    body: IMultiUserTodoEditHistoryEntryChange.IUpdate;
  };
  export type Body = IMultiUserTodoEditHistoryEntryChange.IUpdate;
  export type Response = IMultiUserTodoEditHistoryEntryChange;

  export const METADATA = {
    method: "PUT",
    path: "/multiUserTodo/member/todos/:todoId/editHistoryEntries/:editHistoryEntryId/changes/:changeId",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/multiUserTodo/member/todos/${encodeURIComponent(props.todoId ?? "null")}/editHistoryEntries/${encodeURIComponent(props.editHistoryEntryId ?? "null")}/changes/${encodeURIComponent(props.changeId ?? "null")}`;
  export const random = (): IMultiUserTodoEditHistoryEntryChange =>
    typia.random<IMultiUserTodoEditHistoryEntryChange>();
  export const simulate = (
    connection: IConnection,
    props: updateTodoEditHistoryEntryChange.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: updateTodoEditHistoryEntryChange.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("todoId")(() => typia.assert(props.todoId));
      assert.param("editHistoryEntryId")(() =>
        typia.assert(props.editHistoryEntryId),
      );
      assert.param("changeId")(() => typia.assert(props.changeId));
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

/**
 * Permanently removes a single todo edit-history field change record identified by its change ID.
 *
 * This operation targets the normalized edit history changes table, where each row records one changed todo field (changed_field) and its before/after values (from_value, to_value) for a specific edit history entry (multi_user_todo_edit_history_entries).
 *
 * The resource is addressed through a deep path that includes:
 *
 * - the todo identifier ({todoId}), which provides the ownership/privacy scope for the acting member
 * - the todo edit history entry identifier ({editHistoryEntryId}), which scopes the change to a particular edit event
 * - the change identifier ({changeId}), which uniquely identifies the field-level change row to remove
 *
 * Security and privacy: the acting member must be allowed to manage only their own todos. Even though the deepest record is removed, authorization is enforced by resolving the change’s parent edit history entry back to the owning todo, and then verifying the todo belongs to the authenticated acting member. If the change does not exist within the resolved scope (or belongs to another user’s todo), the system rejects the operation and does not remove any record.
 *
 * Validation and edge cases: if the targeted change row is not found under the specified todoId and editHistoryEntryId scope, the operation must fail with a not-found style error rather than deleting an unrelated row.
 *
 * After deletion, the change row is no longer available in edit-history detail views for the associated edit history entry. Other edit history entries and other changed_field rows remain unaffected.
 *
 * Related operations: this operation is used together with the todo edit history viewing endpoints to display field-level before/after values, and it can be paired with permanent todo deletion behavior, which requires edit history to be removed when a todo is permanently removed from trash.
 *
 * @param props.connection
 * @param props.todoId Target todo ID that defines the ownership/privacy scope for the acting member.
 * @param props.editHistoryEntryId Target todo edit history entry ID that must match the parent of the change record.
 * @param props.changeId Target change record ID to permanently remove.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Service-layer algorithm:
 * 1) Authenticate the acting user (member) and obtain their identity.
 * 2) Resolve the target record using the provided path parameters:
 *    - Find multi_user_todo_edit_history_entry_changes by id = {changeId}.
 *    - Ensure the found record’s multi_user_todo_edit_history_entry_id equals {editHistoryEntryId}.
 * 3) Enforce ownership scope:
 *    - Join multi_user_todo_edit_history_entry_changes -> multi_user_todo_edit_history_entries (by multi_user_todo_id).
 *    - Verify that the resolved todo (multi_user_todo_id) belongs to the authenticated acting member.
 *    - If not found or ownership fails, raise NotFound/Forbidden according to the system’s unified error handling rules.
 * 4) Perform hard deletion of the change row.
 * 5) Return success with no response body.
 *
 * Database considerations:
 * - Use a single transaction for the lookup and deletion to avoid race conditions.
 * - The table has @@unique([multi_user_todo_edit_history_entry_id, changed_field]); however this operation deletes by primary key id, so it only requires id-based lookup plus the editHistoryEntryId scope check.
 *
 * Error handling:
 * - If any required link in the chain cannot be resolved under the provided ids, fail without deleting.
 * - Ensure that deleting a change record does not cascade unexpectedly beyond the change row; rely on the schema’s onDelete behavior for the relation (multi_user_todo_edit_history_entries -> changes exists but deleting the change row should not delete the parent automatically).
 *
 * This operation should not attempt to interpret deleted_at for the changes table; it should remove the targeted record directly as part of the requested permanent removal action.
 * @path /multiUserTodo/member/todos/:todoId/editHistoryEntries/:editHistoryEntryId/changes/:changeId
 * @accessor api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Target todo ID that defines the ownership/privacy scope for the acting member.
     */
    todoId: string & tags.Format<"uuid">;

    /**
     * Target todo edit history entry ID that must match the parent of the change record.
     */
    editHistoryEntryId: string & tags.Format<"uuid">;

    /**
     * Target change record ID to permanently remove.
     */
    changeId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/multiUserTodo/member/todos/:todoId/editHistoryEntries/:editHistoryEntryId/changes/:changeId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/multiUserTodo/member/todos/${encodeURIComponent(props.todoId ?? "null")}/editHistoryEntries/${encodeURIComponent(props.editHistoryEntryId ?? "null")}/changes/${encodeURIComponent(props.changeId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("todoId")(() => typia.assert(props.todoId));
      assert.param("editHistoryEntryId")(() =>
        typia.assert(props.editHistoryEntryId),
      );
      assert.param("changeId")(() => typia.assert(props.changeId));
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
