import { IPage } from "./IPage";
import { ITodoAppUserPasswordReset } from "./ITodoAppUserPasswordReset";

export namespace IPageITodoAppUserPasswordReset {
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
     * @x-autobe-specification List of records of type ITodoAppUserPasswordReset.ISummary.
     */
    data: ITodoAppUserPasswordReset.ISummary[];
  };
}
