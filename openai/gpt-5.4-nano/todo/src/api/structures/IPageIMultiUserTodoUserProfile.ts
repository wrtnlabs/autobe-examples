import { IMultiUserTodoUserProfile } from "./IMultiUserTodoUserProfile";
import { IPage } from "./IPage";

export namespace IPageIMultiUserTodoUserProfile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IPagination = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IMultiUserTodoUserProfile.IPagination.
     */
    data: IMultiUserTodoUserProfile.IPagination[];
  };
}
