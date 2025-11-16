import { IPage } from "./IPage";
import { ITodoAppActorSession } from "./ITodoAppActorSession";

export namespace IPageITodoAppActorSession {
  /**
   * Paginated, unified list of actor session summaries across all todoApp
   * session tables.
   *
   * This schema is used as the response envelope for operations such as
   * `/todoApp/todoAdmin/actors/sessions`, where administrators need to
   * search, filter, and page through session records spanning guest users,
   * registered todo users, and todo administrators. It combines generic
   * pagination metadata with an array of `ITodoAppActorSession.ISummary`
   * objects that normalize session information across the different
   * underlying Prisma models.
   *
   * The `pagination` property follows the common `IPage.IPagination` contract
   * and describes which slice of the full result set is being returned,
   * including the current page index, page size, and aggregate counts. The
   * `data` array contains the actor session summaries belonging to that page
   * only, allowing security monitoring tools and admin consoles to present
   * large session datasets in manageable, pageable views while preserving
   * cross-actor context.
   */
  export type ISummary = {
    /**
     * Page-level pagination metadata for the unified actor session listing.
     *
     * This object uses the shared `IPage.IPagination` schema to describe
     * the current page index, page size, and overall record and page counts
     * across all actor session records that match the search criteria. It
     * enables clients to navigate through large result sets in a
     * predictable, consistent way.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of normalized actor session summaries for the current
     * page.
     *
     * Each element is an `ITodoAppActorSession.ISummary`, which provides a
     * unified view of a single session regardless of whether it originated
     * from `todo_app_todoadmin_sessions`, `todo_app_todouser_sessions`, or
     * `todo_app_guestuser_sessions`. The records returned here are limited
     * to the subset defined by the `pagination` metadata and the filters
     * supplied in the corresponding request.
     */
    data: ITodoAppActorSession.ISummary[];
  };
}
