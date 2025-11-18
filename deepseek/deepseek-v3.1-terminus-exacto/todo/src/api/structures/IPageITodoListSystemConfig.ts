import { IPage } from "./IPage";
import { ITodoListSystemConfig } from "./ITodoListSystemConfig";

export namespace IPageITodoListSystemConfig {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListSystemConfig.ISummary[];
  };
}
