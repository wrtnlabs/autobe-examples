import { IPage } from "./IPage";
import { ITodoAppHistory } from "./ITodoAppHistory";

export namespace IPageITodoAppHistory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type ITodoAppHistory.ISummary.
     */
    data: ITodoAppHistory.ISummary[];
  };
}
