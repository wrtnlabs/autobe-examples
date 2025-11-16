import { IPage } from "./IPage";
import { ITodoAppSystemConfig } from "./ITodoAppSystemConfig";

export namespace IPageITodoAppSystemConfig {
  /**
   * Paginated collection of system configuration summaries derived from
   * `todo_app_system_configs`.
   *
   * This wrapper DTO represents the response body for the PATCH
   * `/todoApp/todoAdmin/systemConfigs` operation and combines pagination
   * metadata with a list of `ITodoAppSystemConfig.ISummary` items. It allows
   * administrative consoles to present a grid of configuration entries while
   * also knowing the total number of matching records, the current page
   * index, and how many pages are available for navigation.
   *
   * The `pagination` property contains page-level statistics based on the
   * search criteria defined in `ITodoAppSystemConfig.IRequest`, and the
   * `data` property contains the actual configuration entries for the current
   * slice of results.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current view over system configuration
     * entries.
     *
     * This object follows the shared `IPage.IPagination` schema and exposes
     * fields such as `current` page index, `limit` page size, `records`
     * total number of configuration rows that match the search criteria in
     * `todo_app_system_configs`, and `pages` total number of pages. Admin
     * clients use this information to render paging controls (for example,
     * next/previous buttons) when browsing configuration entries returned
     * from the PATCH `/todoApp/todoAdmin/systemConfigs` search endpoint.
     */
    pagination: IPage.IPagination;

    /**
     * List of system configuration summary entries for the current page.
     *
     * Each element in this array is an `ITodoAppSystemConfig.ISummary` DTO
     * that corresponds directly to a single row in the
     * `todo_app_system_configs` Prisma model. These summaries expose key
     * identifying fields such as `scope`, `key`, `value`, and activity
     * timestamps, allowing administrative tools to render configuration
     * overviews and navigate to detail or edit views for individual
     * configuration entries.
     */
    data: ITodoAppSystemConfig.ISummary[];
  };
}
