import { IPage } from "./IPage";
import { ITodoAppRateLimitEvent } from "./ITodoAppRateLimitEvent";

export namespace IPageITodoAppRateLimitEvent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppRateLimitEvent.ISummary[];
  };
}
