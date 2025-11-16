import { IPage } from "./IPage";
import { ITodoAppTodoAdminAudit } from "./ITodoAppTodoAdminAudit";

export namespace IPageITodoAppTodoAdminAudit {
  /**
   * Paginated collection of administrative audit summaries for a single todo
   * item.
   *
   * This DTO serves as the response body for administrative list operations
   * over the `todo_app_todo_admin_audits` Prisma table, in particular the
   * `PATCH /todoApp/todoAdmin/todos/{todoId}/adminAudits` endpoint. It binds
   * together the pagination state and a page of
   * `ITodoAppTodoAdminAudit.ISummary` entries that describe how a todo has
   * been modified by administrators over time.
   *
   * The `pagination` property exposes the standard `IPage.IPagination` fields
   * so admin consoles can render paging controls and understand the overall
   * size of the audit trail. The `data` array contains a time-ordered slice
   * of audit records scoped to the todo specified by `todoId`, enabling
   * support staff and operators to efficiently review, filter, and navigate
   * the history of administrative actions without loading the full audit
   * dataset at once.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the administrative audit trail list.
     *
     * This object follows the `IPage.IPagination` contract and captures the
     * current page number, page size, total number of audit records, and
     * total page count for the query against `todo_app_todo_admin_audits`.
     * It is evaluated in the context of a single todo identified by the
     * `todoId` path parameter of the `PATCH
     * /todoApp/todoAdmin/todos/{todoId}/adminAudits` operation.
     *
     * Administrators use this pagination information to browse the audit
     * history of a todo in chronological segments, ensuring efficient
     * retrieval even when long-running histories exist.
     */
    pagination: IPage.IPagination;

    /**
     * Array of administrative audit summary records for the current page.
     *
     * Each element is an `ITodoAppTodoAdminAudit.ISummary` DTO representing
     * one row from the `todo_app_todo_admin_audits` Prisma model linked to
     * the target todo. These summaries include key fields such as the
     * action code, the timestamp of the change, and embedded summaries of
     * both the affected todo and the acting administrator.
     *
     * The collection reflects the subset of audit entries that match the
     * filters specified in `ITodoAppTodoAdminAudit.IRequest` (for example,
     * by action type, field name, administrator, or creation time range),
     * ordered and paginated according to the requested criteria.
     */
    data: ITodoAppTodoAdminAudit.ISummary[];
  };
}
